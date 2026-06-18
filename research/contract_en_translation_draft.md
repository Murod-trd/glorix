# Contract translation draft — Russian source → English (for review)

Translated directly from the current live source (`src/pages/LegalAI.jsx`, `buildContract`).
JS template variables preserved in `${...}` form exactly as they appear in source, since these
will be carried into the new structured data format.

---

## HEADER

```
SALE AND PURCHASE CONTRACT No. ${num}

${city || 'Tashkent'}                                          "___" __________ ${new Date().getFullYear()}
```

## PREAMBLE

```
${seller || '________________________________'}, a legal entity duly established and
operating under the laws of ${sLaw?.country || sellerCountry}, represented by
________________________________, acting on the basis of _________________,
hereinafter referred to as the "SELLER", of the one part,

and

${buyer || '________________________________'}, a legal entity duly established and
operating under the laws of ${bLaw?.country || buyerCountry}, represented by
________________________________, acting on the basis of _________________,
hereinafter referred to as the "BUYER", of the other part,

jointly referred to as the "Parties", and individually as a "Party",

WHEREAS:
— the Parties intend to establish a long-term commercial relationship based on the
  principles of good faith and equality;
— this Contract is concluded on the terms of full commercial independence of the Parties;
— the Parties have been verified on the GLORIX platform ✓,

HAVE CONCLUDED this Contract as follows:
```

## ARTICLE 1. SUBJECT OF THE CONTRACT

```
1.1. The SELLER undertakes to transfer ownership of, and the BUYER undertakes to accept
     and pay for, the following goods (hereinafter — the "Goods"):

     Description: ${goods || '________________________________'}
     Specifications: as per Specification (Appendix No. 1)
     Country of origin: ${sLaw?.country || sellerCountry}

1.2. The Goods are new and unused, manufactured no earlier than ${new Date().getFullYear() - 1}.

1.3. The Goods are free from any rights or claims of third parties and are not subject
     to pledge, litigation, seizure, or any other encumbrance.

1.4. The transferred Goods are acquired by the BUYER for commercial use.
```

## ARTICLE 2. PRICE AND TOTAL VALUE OF THE CONTRACT

```
2.1. The total value of this Contract is:
     ${amt}
     (${amount ? 'amount in words' : '___________________________'})
     on the terms of ${deliveryTermsText}.

2.2. The stated price is FINAL and shall not be unilaterally amended after signing
     of the Contract.

2.3. The price includes: packing, marking, loading, and all costs borne by the SELLER
     in performing the delivery terms.

2.4. The Contract amount includes all taxes, duties, and fees payable by the SELLER
     in accordance with applicable law.

2.5. All bank charges arising at the BUYER's bank shall be borne by the BUYER; charges
     arising at the SELLER's bank (including the correspondent bank) shall be borne
     by the SELLER.
```

## ARTICLE 3. PAYMENT TERMS

```
3.1. Currency of payment: ${currency}.

3.2. Payment procedure: ${payTerms || '30% advance payment within 5 banking days from the date of signing the Contract; 70% within 10 banking days from the date of signing the Acceptance Certificate.'}

3.3. Payments are made by bank transfer to the SELLER's account details.

3.4. The BUYER's payment obligation is deemed fulfilled at the moment the funds are
     credited to the correspondent account of the SELLER's bank.

3.5. The Parties have agreed to use the GLORIX platform Escrow account to hold funds
     until the delivery terms are fulfilled, ensuring protection for both Parties.

3.6. In the event of a change of bank details, the SELLER shall notify the BUYER in
     writing no less than 5 working days in advance. Payments made to the previous
     bank details prior to receipt of such notice shall be deemed proper performance.
```

## ARTICLE 4. QUALITY OF GOODS AND TECHNICAL REQUIREMENTS

```
4.1. The Goods shall conform to the technical characteristics, standards, and
     specifications set out in Appendix No. 1 to this Contract.

4.2. The quality of the Goods shall be confirmed by a quality certificate from the
     manufacturer and/or an accredited laboratory.

4.3. When supplying equipment or complex goods, the SELLER shall, within 15 (fifteen)
     calendar days of the date of signing the Contract, provide the BUYER with:
     a) a production/delivery schedule;
     b) weekly production progress reports (every Wednesday by 12:00, SELLER's time zone).

4.4. The BUYER is entitled to carry out a quality inspection of the Goods at the
     SELLER's production facility, engaging its own representatives or independent
     inspectors (SGS, Bureau Veritas, Intertek, and similar). Inspection costs shall
     be borne by the BUYER unless otherwise agreed by the Parties.

4.5. Goods manufactured with deviation from the agreed specifications without the
     BUYER's written consent shall not be subject to payment and shall be returned
     at the SELLER's expense.

4.6. When engaging sub-suppliers, the SELLER shall:
     a) notify the BUYER of each sub-supplier;
     b) provide the sub-supplier with an internal order number;
     c) ensure the sub-supplier's compliance with all terms of this Contract.
```

## ARTICLE 5. CONTAINERS, PACKING, AND MARKING

```
5.1. Containers and packing shall ensure the preservation of the Goods during
     transportation, loading, unloading, and storage in accordance with the terms
     of ${deliveryTermsText}.

5.2. Each shipping package shall be marked with:
     — the BUYER's name and address;
     — the Contract and Specification number;
     — country of origin;
     — dimensions: length × width × height (cm);
     — gross/net weight (kg);
     — quantity of units;
     — handling marks ("Caution!", "Fragile", "Keep dry", "This side up",
       "Sling here").

5.3. Packing shall allow for inspection of the contents without destroying it.

5.4. The SELLER shall be liable for damage to the Goods resulting from improper
     packing prior to transfer of the Goods to the BUYER's authorized person.

5.5. All documentation (technical, financial, accompanying) shall be drawn up in
     Russian and English. Both texts shall have equal legal force.
```

## ARTICLE 6. DELIVERY TIME AND PROCEDURE

```
6.1. Delivery time: ${deliveryDays || '___'} (${deliveryDays ? 'in words' : '_____________'})
     working days from the date the advance payment is received in the SELLER's
     account, unless otherwise specified in the Specification.

6.2. Delivery terms: ${deliveryTermsText}.
     Destination point — as per the Specification (Appendix No. 1).

6.3. Delivery in batches is permitted only with the BUYER's written consent. In the
     case of delivery by batches, each batch shall be accompanied by the full set of
     documents under Article 7.

6.4. The SELLER shall notify the BUYER of the Goods' readiness for shipment no later
     than 10 (ten) working days prior to the planned shipment date.

6.5. Time limits for remedying violations (from the date of the BUYER's written
     demand):
     a) delivery of an undelivered quantity — 20 days;
     b) remedying defects without replacement of the Goods — 30 days;
     c) replacement of defective Goods — 30 days;
     d) provision of missing documents — 10 days;
     e) delivery of missing accessories — 15 days.
     The right to choose the method of remedy (repair or replacement) belongs to
     the BUYER.

6.6. The BUYER may at any time send written notice to suspend delivery. The SELLER
     shall suspend performance within 3 working days.

6.7. ⚖ MIRROR: The SELLER is entitled to suspend delivery if payment is overdue by
     more than 15 days, by giving 3 working days' notice. Storage costs for the
     Goods during the suspension period shall be borne by the Party at fault.
```

## ARTICLE 7. DOCUMENTS ACCOMPANYING THE GOODS

```
7.1. The SELLER shall provide the BUYER, together with the Goods, with:
     a) an invoice indicating the Contract and Specification No. — 1 original
        + 1 copy;
     b) a commodity/transport waybill — 1 original + 1 copy;
     c) a quality certificate (from the manufacturer or an accredited laboratory)
        — 1 certified copy;
     d) a certificate of conformity — 1 certified copy;
     e) a certificate of origin (CT-1 for the CIS / Form A / EUR.1 — depending on
        the route) — 1 original;
     f) a packing list — 1 original;
     g) a transport document (CMR / bill of lading / air waybill) indicating the
        destination and the BUYER — 1 original;
     h) a technical passport and equipment list (for equipment) — 1 original
        + 1 copy;
     i) installation, operation, and storage instructions (for equipment)
        — 1 original;
     j) a document on storage and preservation procedures — 1 original.

7.2. Electronic copies of all documents shall be sent to the BUYER by email within
     2 working days of the date of shipment.

7.3. If errors, discrepancies, or incomplete documents are discovered, the BUYER
     shall send its comments within 5 working days. The SELLER shall correct and
     provide accurate documents within 5 working days.
```

## ARTICLE 8. GOODS ACCEPTANCE PROCEDURE

```
8.1. Acceptance of the Goods shall be carried out by the BUYER's authorized person
     on the basis of a power of attorney.

8.2. Upon acceptance, the Goods shall be checked for compliance with respect to:
     — description, range, and completeness;
     — quantity (weight, volume, units);
     — appearance (visible damage, condition of packing).

8.3. The Acceptance Certificate shall be signed by authorized representatives of
     both Parties within 10 working days of delivery of the Goods to the specified
     destination point.

8.4. If discrepancies are discovered, the BUYER shall:
     — not sign the Acceptance Certificate;
     — send the SELLER written notice with a list of claims within 3 working days;
     — call the SELLER's representative to draw up a Defects Report.

8.5. The SELLER's representative shall appear within 5 working days of receiving
     the call. If the representative fails to appear, the BUYER may draw up the
     Defects Report unilaterally, engaging an independent inspector.

8.6. Title to and risk of accidental loss or damage of the Goods shall pass from
     the SELLER to the BUYER upon both Parties signing the Acceptance Certificate.

8.7. An Acceptance Certificate signed without comments shall evidence the absence
     of any claims by the BUYER as to the quantity, completeness, and external
     condition of the Goods as of the date of acceptance.
```

## ARTICLE 9. WARRANTY OBLIGATIONS

```
9.1. The SELLER warrants the proper operation and conformity of the Goods to the
     stated specifications for 24 (twenty-four) months from the date of signing
     the Acceptance Certificate (hereinafter — the "Warranty Period").

9.2. During the Warranty Period, the SELLER shall, at its own expense, remedy all
     defects or replace defective Goods within a period agreed by the Parties,
     not to exceed 30 days from the date of notice.

9.3. The SELLER shall bear no warranty obligation in the event of:
     — damage caused by the BUYER's breach of the operating instructions;
     — damage during transportation arranged by the BUYER (in the case of EXW,
       FCA, or FOB terms);
     — force majeure (Article 12).

9.4. The Warranty Period shall be extended by the period during which the BUYER
     was unable to use the Goods due to the SELLER's fault.

9.5. All costs related to the replacement and repair of the Goods under warranty
     shall be borne by the SELLER.
```

## ARTICLE 10. LIABILITY OF THE PARTIES
### (⚖ MIRRORED PENALTIES — EQUAL FOR BOTH PARTIES)

```
10.1. DELAY IN DELIVERY — SELLER's liability:
      For each calendar day of delay in delivery beyond the established time limit,
      the SELLER shall pay a penalty of ${rate}% (${rate} percent) of the value of
      the Goods not delivered on time.
      Maximum penalty: ${maxP}% of the value of the Goods.
      Payment: within 10 days of the date of written demand.

10.2. DELAY IN PAYMENT — BUYER's liability:
      ⚖ MIRRORS clause 10.1 — IDENTICAL TERMS:
      For each calendar day of delay in payment, the BUYER shall pay a penalty of
      ${rate}% of the unpaid amount.
      Maximum penalty: ${maxP}% of the amount owed.
      Payment: within 10 days of the date of written demand.
      [Exception: force majeure under Article 12]

10.3. NON-DELIVERY OF GOODS — SELLER's liability:
      In the event of non-delivery of the Goods within 20 days of the expiry of
      the delivery period, the SELLER shall:
      a) refund all advance payment received within 10 days;
      b) pay a penalty of 10% of the value of the undelivered Goods.

10.4. REFUSAL TO PAY — BUYER's liability:
      ⚖ MIRRORS clause 10.3 — IDENTICAL TERMS:
      In the event of unjustified refusal to pay for delivered Goods, the BUYER
      shall:
      a) accept the Goods and pay for them within 10 days;
      b) pay a penalty of 10% of the value of the Goods.
      The SELLER may demand the return of the Goods.

10.5. QUALITY VIOLATION — SELLER's liability:
      In the event of non-delivery of documents (Article 7) or breach of the
      production schedule, the SELLER shall pay a penalty of ${rate}%/day of the
      value of the batch. Maximum — ${maxP}%.

10.6. UNJUSTIFIED REFUSAL TO ACCEPT — BUYER's liability:
      ⚖ MIRRORS clause 10.5:
      In the event of unjustified evasion of acceptance of the Goods, the BUYER
      shall reimburse the SELLER's storage costs and pay a penalty of ${rate}%/day
      of the value of the Goods.

10.7. RIGHT OF SET-OFF:
      The BUYER may set off penalties payable by the SELLER against the BUYER's
      payments.
      ⚖ MIRROR: The SELLER may withhold the value of unpaid batches from
      remaining deliveries.

10.8. Payment of fines and penalties shall NOT release the Party at fault from
      performing its obligations under the Contract. All sanctions shall be
      recovered IN ADDITION TO compensation for losses.

10.9. SUSPENSION OF PAYMENTS:
      The BUYER may suspend payments to the SELLER until the SELLER's violations
      are remedied.
      ⚖ MIRROR: The SELLER may suspend delivery until the BUYER's payment delay
      is remedied.
      Suspension shall not constitute a breach of the Contract.
```

## ARTICLE 11. CLAIMS PROCEDURE

```
11.1. All claims shall be submitted in writing (registered letter with
      acknowledgment of receipt + email). Recourse to arbitration is permitted
      only after compliance with the claims procedure.

11.2. A claim shall contain:
      — the description and quantity of the Goods;
      — the substance of the violation, with reference to the relevant Contract
        clause;
      — the amount claimed, with calculation;
      — attachments: certificates, photographs, expert opinions, waybills,
        certificates.

11.3. The Party receiving the claim shall provide a written, reasoned response
      within 30 (thirty) calendar days.

11.4. If a Party fails to exercise its right to verify the validity of the claim,
      the claim shall be deemed accepted.

11.5. In the event of partial acceptance of a claim, the Party shall indicate the
      accepted and disputed portions thereof.
```

## ARTICLE 12. FORCE MAJEURE

```
12.1. The Parties shall be released from liability for partial or complete
      non-performance of obligations if such non-performance results from
      circumstances of force majeure arising after conclusion of the Contract,
      namely: natural disasters (earthquake, flood, hurricane, tsunami), military
      action, blockade, riot, insurrection, revolution, declaration of a state of
      emergency or martial law, epidemic, pandemic, quarantine, strikes,
      government prohibitions and restrictions, and sanctions imposed after the
      signing of the Contract.

12.2. A Party affected by force majeure shall notify the other Party in writing
      within 14 (fourteen) calendar days of the occurrence of the force majeure
      event. The fact of force majeure shall be confirmed by a certificate from
      the competent state authority or the Chamber of Commerce and Industry of
      the country where the relevant events occurred.

12.3. Failure to comply with the notification period shall deprive the Party of
      the right to rely on force majeure as grounds for release from liability.

12.4. If force majeure circumstances continue for more than 90 (ninety) calendar
      days, either Party may terminate the Contract without mutual sanctions by
      giving written notice. The SELLER shall refund to the BUYER all advance
      payment made for undelivered Goods within 10 working days of the date of
      termination.
```

## ARTICLE 13. TERMINATION OF THE CONTRACT

```
13.1. The BUYER may unilaterally terminate the Contract out of court, with
      immediate refund of amounts paid, if the SELLER:
      a) is declared insolvent (bankrupt);
      b) has commenced liquidation proceedings;
      c) has delayed delivery by more than 30 days;
      d) has refused to perform the Contract.

13.2. ⚖ MIRROR: The SELLER may terminate the Contract if the BUYER:
      a) has delayed payment by more than 30 days;
      b) has refused without grounds to accept conforming Goods;
      c) is declared insolvent or has commenced liquidation proceedings.

13.3. The BUYER may terminate the Contract for convenience by giving 30 days'
      written notice. In such case, the BUYER shall reimburse the SELLER for
      documented direct costs incurred prior to receipt of the termination
      notice, not to exceed the value of Goods actually manufactured/delivered.

13.4. Upon termination, the SELLER shall:
      a) immediately cease delivery and production;
      b) transfer to the BUYER any Goods already manufactured;
      c) provide all documentation relating to the Goods;
      d) where termination is due to the SELLER's fault, reimburse the BUYER for
         the cost of completing delivery through a third party.
```

## ARTICLE 14. CONFIDENTIALITY

```
14.1. The Parties shall treat as confidential all information obtained in
      connection with the performance of this Contract, including: commercial
      terms, prices, technical specifications, and information about
      counterparties.

14.2. The Parties undertake to:
      a) not disclose confidential information to third parties without the
         other Party's written consent, except as required by applicable law;
      b) take protective measures no less stringent than those applied to their
         own information.

14.3. The confidentiality obligation shall remain in effect for 3 (three) years
      after termination of the Contract.
```

## ARTICLE 15. ANTI-CORRUPTION CLAUSE

```
15.1. The Parties undertake to comply with applicable anti-corruption
      legislation, including the UK Bribery Act 2010, the US Foreign Corrupt
      Practices Act (FCPA), and applicable national anti-corruption laws.

15.2. The Parties shall not offer, promise, give, or accept bribes, unlawful
      remuneration, or any other improper benefit in any form.

15.3. A breach of this Article shall entitle the other Party to terminate the
      Contract immediately, with no financial consequences for the terminating
      Party.
```

## ARTICLE 16. GOVERNING LAW AND DISPUTE RESOLUTION

```
16.1. GOVERNING LAW:
      ${appliedLaw}
      ${scope === 'international'
        ? 'The United Nations Convention on Contracts for the International Sale of Goods (CISG, Vienna, 1980) shall apply to matters not governed by the chosen law.'
        : `The law of ${sLaw?.country || sellerCountry} shall apply on a subsidiary basis.`}

16.2. LANGUAGES OF THE CONTRACT:
      This Contract is executed in Russian and English. Both texts shall have
      equal legal force. In the event of any discrepancy, the Russian text shall
      prevail for transactions within the CIS; the English text shall prevail
      for international transactions.

16.3. DISPUTE RESOLUTION — THREE-STAGE PROCEDURE:

      STAGE 1 — NEGOTIATION (mandatory):
      The Parties shall make good-faith efforts to resolve any dispute through
      negotiation within 30 (thirty) calendar days of the date written notice of
      the dispute is given.

      STAGE 2 — MEDIATION (if no agreement is reached):
      If negotiation does not result in a resolution, the Parties may refer the
      matter to a mediator agreed by both Parties within 15 days.

      STAGE 3 — ARBITRATION (final):
      ${arb}
      Language of arbitral proceedings: Russian / English.
      Composition of the tribunal: one arbitrator (for disputes up to USD 1
      million); three arbitrators (for disputes exceeding USD 1 million).
      The arbitral award shall be final and binding on both Parties.
      ${scope === 'international' ? 'Recognition and enforcement of awards shall be governed by the 1958 New York Convention.' : ''}
```

## ARTICLE 17. CORRESPONDENCE BETWEEN THE PARTIES

```
17.1. Official correspondence shall be sent to the details specified in Article
      19, by the following means:
      — courier service (DHL, FedEx, EMS, and similar);
      — registered letter with acknowledgment of receipt;
      — email (for routine correspondence, without legal effect unless otherwise
        agreed).

17.2. Correspondence shall be deemed received:
      — by courier — on the day of delivery;
      — by post — on the 7th day from the date of dispatch;
      — by email — on the day of sending (absent a non-delivery notification).

17.3. A Party shall notify the other Party in writing of any change of details
      within 3 working days.
```

## ARTICLE 18. MISCELLANEOUS

```
18.1. This Contract shall enter into force on the date of signing by both
      Parties and shall remain in effect until the Parties have fully performed
      all their obligations hereunder.

18.2. All amendments and supplements to the Contract shall be valid only if made
      in writing and signed by authorized representatives of both Parties.

18.3. The SELLER shall not assign its rights and obligations under this Contract
      to third parties without the BUYER's written consent.
      ⚖ MIRROR: The BUYER shall not assign its claims without the SELLER's
      written consent.

18.4. The invalidity of one or more provisions of the Contract shall not entail
      the invalidity of the remaining provisions. The Parties shall replace any
      invalid provision with a legally valid one as close in meaning as possible.

18.5. The Contract is executed in 2 (two) counterparts in Russian and English,
      having equal legal force, one counterpart for each Party.

18.6. All prior negotiations, agreements, and correspondence relating to the
      subject matter of this Contract shall cease to have legal effect upon its
      signing.
```

## ARTICLE 19. DETAILS AND SIGNATURES OF THE PARTIES

```
SELLER:                             BUYER:
${seller || '________________________'}    ${buyer || '________________________'}

Registered address: _______________    Registered address: _______________
Tax ID: ____________________            Tax ID: ____________________
Bank: ______________________            Bank: ______________________
Account: ___________________            Account: ___________________
SWIFT/BIC: _________________            SWIFT/BIC: _________________
Email: _____________________            Email: _____________________
Phone: _____________________            Phone: _____________________

Signature: _________________            Signature: _________________
Full name: _________________            Full name: _________________
Position: __________________            Position: __________________
Date: ______________________            Date: ______________________
Seal                                     Seal
```

## APPENDICES

```
APPENDICES TO THE CONTRACT:
Appendix No. 1 — Specification (technical characteristics, quantity, price,
                 unit of measurement)
Appendix No. 2 — Acceptance Certificate (form)
Appendix No. 3 — Production/delivery schedule (if applicable)
```

## GLORIX DISCLAIMER

```
⚠ GLORIX LEGAL AI NOTE:
This document has been drafted in accordance with international commercial law
standards. Governing law: ${appliedLaw}.
Mirrored penalties: ${rate}%/day, maximum ${maxP}%.
Review by a qualified lawyer is recommended prior to signing.
Generated on: ${d}
```
