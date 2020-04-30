import csvParse from 'csv-parse';
import fs from 'fs';
import { getCustomRepository, getRepository, In } from 'typeorm';

import Category from '../models/Category';
import Transaction from '../models/Transaction';
import TransactionRepository from '../repositories/TransactionsRepository';

import AppError from '../errors/AppError';

interface Request {
  csvFilePath: string;
}

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  private transactions: Transaction[];

  private categories: { [x: string]: Category } = {};

  private csvTransactions: CSVTransaction[];

  private categoriesTitles: string[];

  private total: number;

  async execute({ csvFilePath }: Request): Promise<Transaction[]> {
    await this.loadFrom(csvFilePath);

    /**
     *    CHECK BY FUND AVAILABILITY
     */
    await this.hasTotalAvailable(this.total);

    /**
     *    HANDLE CATEGORIES
     *    [ ] Filter duplicates categories
     *    [ ] Create new categories
     *    [ ] Find for categories existents
     *    [ ] Save new categories on database
     *    [ ] Alter categories attibute on format { [title: string]: value: category }
     */
    await this.handleCategories(this.categoriesTitles);

    /**
     *    HANDLE TRANSACTIONS
     *    [ ] Set the respective category for each transaction
     *    [ ] Create transaction
     *    [ ] Save transaction on database
     *    [ ] Alter transactions attribute
     */
    await this.handleTransactions(this.csvTransactions);

    return this.transactions;
  }

  private async loadFrom(filePath: string): Promise<void> {
    const readCSVStream = fs.createReadStream(filePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const transactions: CSVTransaction[] = [];
    const categoriesTitles: string[] = [];
    let total = 0;

    parseCSV.on('data', line => {
      const [title, type, value, category] = (line as unknown) as string[];

      transactions.push({
        title,
        type: type as 'income' | 'outcome',
        value: (value as unknown) as number,
        category,
      });

      categoriesTitles.push(category);

      total += type === 'income' ? Number(value) : Number(-value);
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    this.csvTransactions = transactions;
    this.categoriesTitles = categoriesTitles;
    this.total = total;
  }

  private async hasTotalAvailable(amount: number): Promise<void> {
    const { total } = await getCustomRepository(
      TransactionRepository,
    ).getBalance();

    if (total + amount < 0) throw new AppError('Insufficient total');
  }

  private async handleCategories(categoriesTitles: string[]): Promise<void> {
    const categories: { [key: string]: Category } = {};

    const categoryRepository = getRepository(Category);

    const categoriesFiltered = categoriesTitles.filter(
      (category, index) => categoriesTitles.indexOf(category) === index,
    );

    const existentCategories = await categoryRepository.find({
      where: { title: In(categoriesFiltered) },
    });

    const existentCategoriesTitles = existentCategories.map(
      category => category.title,
    );

    const newCategoriesTitles = categoriesFiltered.filter(
      category => !existentCategoriesTitles.includes(category),
    );

    const newCategories = newCategoriesTitles.map(category =>
      categoryRepository.create({ title: category }),
    );

    if (newCategories) await categoryRepository.save(newCategories);

    existentCategories.map(category => {
      categories[category.title] = category;
      return true;
    });

    newCategories.map(category => {
      categories[category.title] = category;
      return true;
    });

    this.categories = categories;
  }

  private async handleTransactions(
    transactions: CSVTransaction[],
  ): Promise<void> {
    const transactionRepository = getRepository(Transaction);

    const newTransactions = transactions.map(
      ({ title, type, value, category }) =>
        transactionRepository.create({
          title,
          type,
          value,
          category: this.categories[category],
        }),
    );

    await transactionRepository.save(newTransactions);

    this.transactions = newTransactions;
  }
}

export default ImportTransactionsService;
