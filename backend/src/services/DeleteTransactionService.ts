import { getCustomRepository } from 'typeorm';

import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  transactionId: string;
}

class DeleteTransactionService {
  public async execute({ transactionId }: Request): Promise<void> {
    const transactionRepository = getCustomRepository(TransactionsRepository);

    const transaction = await transactionRepository.findOne({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    await transactionRepository.delete(transactionId);
  }
}

export default DeleteTransactionService;
