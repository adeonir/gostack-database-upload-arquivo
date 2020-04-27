import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';

import Category from '../models/Category';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Import {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const stream = fs.createReadStream(filePath);

    const parse = csvParse({
      from_line: 2,
    });

    const parsedFile = stream.pipe(parse);

    const transactions: Import[] = [];
    const categories: string[] = [];

    parsedFile.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      categories.push(category);

      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parsedFile.on('end', resolve));

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const titleCategories = existentCategories.map(
      (category: Category) => category.title,
    );

    const filterCategories = categories
      .filter(category => !titleCategories.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      filterCategories.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createTransactions = transactionsRepository.create(
      transactions.map(({ title, type, value, category }) => ({
        title,
        type,
        value,
        category: finalCategories.find(cat => cat.title === category),
      })),
    );

    await transactionsRepository.save(createTransactions);

    await fs.promises.unlink(filePath);

    return createTransactions;
  }
}

export default ImportTransactionsService;
