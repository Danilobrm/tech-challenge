import { TransactionDetailView } from '@/views/transaction-detail-view';

export default async function TransactionDetailPage({
  params,
}: PageProps<'/transactions/[transactionExternalId]'>) {
  const { transactionExternalId } = await params;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <TransactionDetailView transactionExternalId={transactionExternalId} />
    </main>
  );
}
