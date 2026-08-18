-- CreateEnum
CREATE TYPE "transaction_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "transfer_types" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "transfer_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "account_external_id_debit" UUID NOT NULL,
    "account_external_id_credit" UUID NOT NULL,
    "transfer_type_id" INTEGER NOT NULL,
    "value" DECIMAL(18,2) NOT NULL,
    "status" "transaction_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_status_history" (
    "id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "from_status" "transaction_status",
    "to_status" "transaction_status" NOT NULL,
    "reason" TEXT,
    "event_id" TEXT NOT NULL,
    "metadata" JSONB,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "transaction_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_messages" (
    "id" UUID NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "published_at" TIMESTAMPTZ(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,

    CONSTRAINT "outbox_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transfer_types_name_key" ON "transfer_types"("name");

-- CreateIndex
CREATE INDEX "transactions_status_created_at_idx" ON "transactions"("status", "created_at");

-- CreateIndex
CREATE INDEX "transactions_transfer_type_id_created_at_idx" ON "transactions"("transfer_type_id", "created_at");

-- CreateIndex
CREATE INDEX "transaction_status_history_transaction_id_occurred_at_idx" ON "transaction_status_history"("transaction_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_status_history_transaction_id_event_id_key" ON "transaction_status_history"("transaction_id", "event_id");

-- CreateIndex
CREATE INDEX "outbox_messages_published_at_occurred_at_idx" ON "outbox_messages"("published_at", "occurred_at");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transfer_type_id_fkey" FOREIGN KEY ("transfer_type_id") REFERENCES "transfer_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_status_history" ADD CONSTRAINT "transaction_status_history_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
