import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import api from "@/shared/api/apiClient";
import { PaymentDialog } from "./PosSalesDialogs";
import LoyaltyRedeemPanel from "./LoyaltyRedeemPanel";
import GiftCreditPanel from "./GiftCreditPanel";
import { giftCreditTotal } from "../utils/giftCredit";
import { computePaymentTotalsFromForm } from "../utils/posSalesUtils";
import { checkoutPaymentProblem, configOptions } from "../utils/checkoutPayment";

const BLANK = { cashAmount: "", cardAmount: "0", cardTypeId: "", upiAmount: "0", upiProviderId: "", refundApproved: false };

/**
 * The POS Sales payment dialog for other billing screens (POS Old, Touch Sales) when Sales Customisation ticks
 * them: cash / card / UPI with card type and UPI provider, balance and change, and the customer's loyalty points.
 * onConfirm({ cashAmount, cardAmount, cardTypeId, upiAmount, upiProviderId, loyalty, giftCredits }, shouldPrint).
 */
export default function CheckoutPaymentDialog({ netAmount, billAmount, discount = 0, customerId, saving, onConfirm, onClose }) {
  const [form, setForm] = useState(BLANK);
  const [loyalty, setLoyalty] = useState(null);
  const [giftCredits, setGiftCredits] = useState([]); // gift vouchers, credit notes and coupons applied to this bill
  const [cardTypes, setCardTypes] = useState([]);
  const [upiProviders, setUpiProviders] = useState([]);
  const cardTypeSelectRef = useRef(null);
  const upiProviderSelectRef = useRef(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get("/configurations/card_types").catch(() => ({ data: { data: [] } })),
      api.get("/configurations/upi_provider").catch(() => ({ data: { data: [] } })),
    ]).then(([cards, upis]) => {
      if (!alive) return;
      setCardTypes(configOptions(cards.data?.data));
      setUpiProviders(configOptions(upis.data?.data));
    });
    return () => { alive = false; };
  }, []);

  const totals = computePaymentTotalsFromForm(form, { amount: netAmount, billsAmount: billAmount }, (loyalty?.amount || 0) + giftCreditTotal(giftCredits));
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const confirm = (shouldPrint) => {
    const problem = checkoutPaymentProblem(form, totals);
    if (problem) {
      toast.error(problem);
      return;
    }
    onConfirm({
      cashAmount: totals.cashAmount, cardAmount: totals.cardAmount, cardTypeId: form.cardTypeId || null,
      upiAmount: totals.upiAmount, upiProviderId: form.upiProviderId || null, loyalty, giftCredits,
    }, shouldPrint);
  };
  const enterSaves = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      confirm(false);
    }
  };

  return (
    <PaymentDialog
      loyaltySlot={(
        <>
          {customerId ? <LoyaltyRedeemPanel customerId={customerId} billAmount={netAmount} value={loyalty} onChange={setLoyalty} /> : null}
          <GiftCreditPanel billAmount={netAmount} otherPaid={loyalty?.amount || 0} value={giftCredits} onChange={setGiftCredits} />
        </>
      )}
      totals={totals}
      totalDiscount={discount}
      refundAmount={0}
      form={form}
      cardTypes={cardTypes}
      upiProviders={upiProviders}
      cardTypeSelectRef={cardTypeSelectRef}
      upiProviderSelectRef={upiProviderSelectRef}
      saving={saving}
      onFieldChange={set}
      onCardTypeChange={(value) => set("cardTypeId", value)}
      onUpiProviderChange={(value) => set("upiProviderId", value)}
      onToggleRefund={() => {}}
      onCashKeyDown={enterSaves}
      onCardAmountKeyDown={enterSaves}
      onCardTypeKeyDown={() => {}}
      onUpiAmountKeyDown={enterSaves}
      onUpiProviderKeyDown={() => {}}
      onSave={confirm}
      onClose={onClose}
    />
  );
}
