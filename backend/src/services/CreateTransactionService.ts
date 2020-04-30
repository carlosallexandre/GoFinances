import { getCustomRepository, getRepository } from 'typeorm';

import AppError from '../errors/AppError';
import Category from '../models/Category';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  categoryTitle: string;
}

class CreateTransactionService {
  public async execute({
    title,
    type,
    value,
    categoryTitle,
  }: Request): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionsRepository);

    /**
     * Check for suficcient funds
     */
    if (type === 'outcome') {
      const balance = await transactionRepository.getBalance();

      if (balance.total - value < 0) {
        throw new AppError('Insuficcient total');
      }
    }

    /**
     * Handle tags
     */
    const categoryRepository = getRepository(Category);
    let category = await categoryRepository.findOne({
      where: { title: categoryTitle },
    });

    if (!category) {
      category = categoryRepository.create({
        title: categoryTitle,
      });

      await categoryRepository.save(category);
    }

    /**
     * Create transaction
     */
    const transaction = transactionRepository.create({
      title,
      value,
      type,
      category,
    });

    await transactionRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
