# Jurisdiction → obligations → official source

A starting map, not a legal opinion. Each row names the obligations a SaaS or app most often meets,
the repo signal that makes the row worth reading, and the official source. Which rows apply depends
on facts the code does not show (establishment, where users are, targeting, thresholds, business
model): list the deciding facts for the founder and the lawyer.

**Every URL below returned the official page on 2026-11-21** (opened with a scraper, title
checked). Open it again before citing it: laws are amended, consolidated versions change, and
application dates are read on the official page, never copied from here. Add a row only with an
official source (legislature, official journal, regulator, platform's own policy page).

## European Union

| Instrument | Obligations to map to the inventory | Repo signal | Official source |
|---|---|---|---|
| GDPR, Regulation (EU) 2016/679 | lawful basis per purpose; transparency (Art. 13-14 notices); data subject rights (access, deletion, portability, objection); processors and DPAs (Art. 28); records of processing; security; breach notification; international transfers; DPIA when high risk | any personal data of people in the EU | <https://eur-lex.europa.eu/eli/reg/2016/679/oj> |
| ePrivacy Directive 2002/58/EC (as transposed in each member state) | consent before storing or reading information on the user's device, except what is strictly necessary; rules for electronic marketing | cookies, local storage, SDKs that write to the device, marketing email | <https://eur-lex.europa.eu/eli/dir/2002/58/oj> |
| Digital Services Act, Regulation (EU) 2022/2065 | for intermediary and hosting services: points of contact, terms that describe content moderation, notice and action, statements of reasons; more duties for online platforms | users publish or host content others can see | <https://eur-lex.europa.eu/eli/reg/2022/2065/oj> |
| AI Act, Regulation (EU) 2024/1689 | classify each AI use by risk; transparency duties (e.g. telling people they interact with AI or that content is generated); obligations staged over several application dates: read them on the official page | LLM or ML features in the product | <https://eur-lex.europa.eu/eli/reg/2024/1689/oj> |
| Consumer Rights Directive 2011/83/EU (amended; read the consolidated version) | pre-contract information, withdrawal right for distance contracts and its exceptions for digital content/services, confirmation of the contract | selling to consumers, subscriptions | <https://eur-lex.europa.eu/eli/dir/2011/83/oj> |
| European Accessibility Act, Directive (EU) 2019/882 | accessibility requirements for in-scope products and services (including e-commerce), as transposed nationally; micro-enterprise exemptions for services | consumer-facing e-commerce or in-scope services | <https://eur-lex.europa.eu/eli/dir/2019/882/oj> |
| EDPB Guidelines 1/2024 on Art. 6(1)(f) GDPR | how to run the legitimate-interest three-part test | any processing based on legitimate interests | <https://www.edpb.europa.eu/public-consultations/guidelines-12024-on-processing-of-personal-data-based-on-article-61f-gdpr_en> |

## Member-state example: Spain

| Instrument | Obligations | Repo signal | Official source |
|---|---|---|---|
| LSSI, Ley 34/2002 | information society services: provider identification, commercial communications, the national cookie rule (transposing ePrivacy) | a website or app offered from or to Spain | <https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758> |
| LOPDGDD, Ley Orgánica 3/2018 | national GDPR complements (e.g. age of consent for information society services, digital rights) | personal data processed in Spain | <https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673> |

Add the member states where the company is established or that it targets, from their official
journal.

## United Kingdom

| Instrument | Obligations | Repo signal | Official source |
|---|---|---|---|
| UK GDPR and Data Protection Act 2018 (regulator guidance) | as GDPR, with UK specifics; legitimate-interest assessment guidance | users in the UK | <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/> |
| PECR | cookies and similar technologies, electronic marketing | cookies, marketing email/SMS to UK users | <https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/> |

## United States

| Instrument | Obligations | Repo signal | Official source |
|---|---|---|---|
| CCPA as amended (California) | notice at collection, rights to know, delete, correct, opt out of sale/sharing; applies above thresholds | users in California and the business meets a threshold | <https://oag.ca.gov/privacy/ccpa> |
| COPPA Rule | verifiable parental consent and more for services directed to children under 13, or with actual knowledge | any chance of under-13 users | <https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa> |
| CAN-SPAM Act | commercial email: accurate headers, identification, physical address, working opt-out honoured promptly | marketing or lifecycle email | <https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business> |

Other US states have their own privacy laws: check the state's official site for each state the
business targets.

## Other jurisdictions (examples)

| Instrument | Obligations | Repo signal | Official source |
|---|---|---|---|
| Brazil, LGPD (Lei 13.709/2018) | legal bases, data subject rights, controller/processor duties, international transfers | users in Brazil | <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm> |
| Canada, PIPEDA | consent and fair information principles for commercial activity | users in Canada | <https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/> |

## Platforms (contractual, not law)

| Platform | Obligation | Repo signal | Official source |
|---|---|---|---|
| Apple App Store | App Privacy details (data types collected, linked to the user, used for tracking) kept accurate | an iOS/macOS app | <https://developer.apple.com/app-store/app-privacy-details/> |
| Google Play | Data safety section kept accurate | an Android app | <https://support.google.com/googleplay/android-developer/answer/10787469> |

## Accessibility standard referenced by several laws

| Standard | Use | Official source |
|---|---|---|
| WCAG 2.2 (W3C Recommendation) | the testable criteria most accessibility laws and procurement rules point to | <https://www.w3.org/TR/WCAG22/> |
