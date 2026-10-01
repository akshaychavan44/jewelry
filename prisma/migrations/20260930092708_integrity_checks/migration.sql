-- Integrity rules the Prisma schema language cannot express.
-- The service layer validates the same rules; these are the last line of defence.

-- Ratings
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_range" CHECK ("rating" BETWEEN 1 AND 5);

-- Inventory can never go negative (atomic decrements rely on this)
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_stock_nonnegative" CHECK ("stockQuantity" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_price_nonnegative" CHECK ("priceMinor" >= 0);

-- Quantities
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_quantity_positive" CHECK ("quantity" > 0);

-- Money
ALTER TABLE "Product" ADD CONSTRAINT "Product_price_nonnegative" CHECK ("basePriceMinor" >= 0 AND "normalizedPriceUsd" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_nonnegative" CHECK ("totalMinor" >= 0);
ALTER TABLE "SellerOrder" ADD CONSTRAINT "SellerOrder_amounts_nonnegative" CHECK ("totalMinor" >= 0 AND "commissionMinor" >= 0);
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_amount_positive" CHECK ("amountMinor" > 0);
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_amount_positive" CHECK ("currentAmountMinor" > 0);

-- Commission rates are basis points (0–100%)
ALTER TABLE "PlatformSettings" ADD CONSTRAINT "PlatformSettings_commission_range" CHECK ("defaultCommissionBps" BETWEEN 0 AND 10000);
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_rate_range" CHECK ("rateBps" BETWEEN 0 AND 10000);
ALTER TABLE "SellerOrder" ADD CONSTRAINT "SellerOrder_commission_range" CHECK ("commissionRateBps" BETWEEN 0 AND 10000);

-- Case-insensitive uniqueness for sign-in emails
CREATE UNIQUE INDEX "User_email_lower_key" ON "User" (lower("email"));
