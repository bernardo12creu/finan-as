import * as XLSX from 'xlsx';
import { Transaction, Category, Account } from '@/data/db';
import { centsToDecimal, formatCentsToBRL } from './money';

export function prepareExportData(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[]
) {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));

  return transactions.map((t) => ({
    Data: t.date,
    Competência: t.competence,
    Tipo: t.type === 'expense' ? 'Despesa' : 'Receita',
    Descrição: t.description,
    Categoria: catMap.get(t.categoryId) || 'Geral',
    Conta: accMap.get(t.accountId) || 'Padrão',
    Pagamento: t.paymentMethod.toUpperCase(),
    'Valor (R$)': centsToDecimal(t.amountCents),
    'Valor Formatado': formatCentsToBRL(t.amountCents),
    Status: t.status === 'confirmed' ? 'Confirmado' : 'Previsto',
    Parcela: t.installment ? `${t.installment.number}/${t.installment.total}` : 'À vista',
    Tags: t.tags.join(', '),
  }));
}

export function exportTransactionsToCSV(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  fileName = 'fecho_lancamentos.csv'
) {
  const data = prepareExportData(transactions, categories, accounts);
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => `"${String(row[h as keyof typeof row] ?? '').replace(/"/g, '""')}"`).join(';')
  );

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportTransactionsToExcel(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  fileName = 'fecho_lancamentos.xlsx'
) {
  const data = prepareExportData(transactions, categories, accounts);
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Lançamentos');
  XLSX.writeFile(workbook, fileName);
}
