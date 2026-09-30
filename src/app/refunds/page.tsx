import type { Metadata } from "next";
import Link from "next/link";
import { Ext, ISSUES_URL, LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Refunds & cancellation",
  description: "How to cancel Scenar Pro, how free trials work, and how to request a refund.",
  alternates: { canonical: "/refunds" },
};

export default function RefundsPage() {
  return (
    <LegalPage
      current="/refunds"
      title="Refunds & cancellation"
      summary={[
        "Cancel any time to stop the next renewal. You keep Pro until the end of the period you paid for.",
        "Free trials cost nothing. Cancel before the trial ends and you will not be charged.",
        "Ask for a refund within 14 days of a charge and we will look at it case by case.",
      ]}
    >
      <h2>Cancelling</h2>
      <p>
        Open <Link href="/account">Account &amp; billing</Link> and choose{" "}
        <strong>Manage or cancel subscription</strong>. This opens RevenueCat&apos;s customer portal,
        where you can cancel in a couple of clicks. The same link is in the receipt email you get after
        purchase. Cancelling stops future renewals; your Pro access continues until the end of the
        current billing period and is not cut short.
      </p>

      <h2>Free trials</h2>
      <p>
        If your plan starts with a free trial, you are not charged during the trial. At the end of the
        trial it converts to the paid plan automatically. To avoid being charged, cancel before the
        trial ends. The trial end date is shown on <Link href="/account">Account &amp; billing</Link>{" "}
        and in the header badge.
      </p>

      <h2>Refunds</h2>
      <p>
        If something went wrong, such as an accidental renewal, a duplicate charge, or Pro not
        unlocking, ask for a refund <strong>within 14 days</strong> of the charge. We review each
        request case by case and aim to be fair, especially where Pro hasn&apos;t really been used.
        Approved refunds go back to the original payment method through Stripe and usually appear
        within 5 to 10 business days.
      </p>
      <h3>How to ask</h3>
      <ul>
        <li>
          Reply to the <strong>Stripe receipt email</strong> for the charge, or
        </li>
        <li>
          <Ext href={ISSUES_URL}>open an issue on GitHub</Ext> with your app user ID (from{" "}
          <Link href="/account">Account &amp; billing</Link>) and the date of the charge. Don&apos;t
          post card details or your email address publicly.
        </li>
      </ul>
      <p>Lifetime purchases are covered by the same 14-day window.</p>

      <h2>EU and UK consumers: right of withdrawal</h2>
      <p>
        If you are a consumer in the EU or UK, you normally have 14 days from purchase to withdraw from
        a contract for digital services. Because Pro unlocks immediately, at checkout you ask us to
        start the service straight away; if you then withdraw within 14 days, we may deduct an amount
        proportionate to the service already provided. Mandatory consumer rights in your country always
        apply, and nothing on this page limits them.
      </p>

      <h2>Sandbox purchases</h2>
      <p>
        Purchases made in the Sandbox environment are test transactions. No money is charged, so there
        is nothing to refund.
      </p>
    </LegalPage>
  );
}
