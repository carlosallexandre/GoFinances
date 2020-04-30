import { EntityRepository, Repository, getCustomRepository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactionRepository = getCustomRepository(TransactionsRepository);

    const transactions = await transactionRepository.find();

    const income = transactions.reduce((total, transaction) => {
      return transaction.type === 'income' ? total + transaction.value : total;
    }, 0);

    const outcome = transactions.reduce((total, transaction) => {
      return transaction.type === 'outcome' ? total + transaction.value : total;
    }, 0);

    const total = income - outcome;

    return {
      income,
      outcome,
      total,
    };
  }
}

export default TransactionsRepository;
