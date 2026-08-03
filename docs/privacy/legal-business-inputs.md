# Privacy legal and business inputs

Status: required before SmartFinance claims GDPR/ePrivacy compliance or
publishes a complete privacy notice.

This checklist records facts that cannot be derived reliably from source code.
It is implementation input, not legal advice. Each answer should have an owner,
evidence, and review date.

## Controller identity

- [ ] Legal name of the SmartFinance operator
- [ ] Registered or business address
- [ ] Country of establishment
- [ ] Company or registration number, if applicable
- [ ] Public privacy contact email
- [ ] General support contact
- [ ] Data Protection Officer contact, or a documented decision that no DPO is
      required
- [ ] EU representative details, if the controller is not established in the
      EEA and Article 27 applies

## Product and users

- [ ] Production domains and mobile application identifiers
- [ ] Countries in which the service is offered
- [ ] Whether the service is offered to children, and the applicable minimum
      age
- [ ] Whether SmartFinance is a consumer, employee, household, or business
      service
- [ ] Whether any regulated financial service is provided, rather than only
      personal finance organization
- [ ] Whether automated decisions or profiling have legal or similarly
      significant effects

## Purposes and legal bases

For every processing purpose in the data inventory:

- [ ] Approved purpose
- [ ] GDPR legal basis
- [ ] Whether providing the data is contractual, statutory, or optional
- [ ] Consequence of not providing the data
- [ ] Legitimate-interest assessment where Article 6(1)(f) is used
- [ ] Consent wording and evidence requirements where consent is used

## Retention and deletion

- [ ] Retention period for active accounts
- [ ] Grace period and recovery policy after account-deletion requests
- [ ] Retention period for financial records after account deletion
- [ ] Retention period for household invitations
- [ ] Retention period for feedback and support records
- [ ] Retention period for notification subscriptions and delivery data
- [ ] Retention period for security, audit, and infrastructure logs
- [ ] Retention and deletion schedule for backups
- [ ] Legal-hold process
- [ ] Rules for shared household data when one member deletes an account
- [ ] Required anonymization versus irreversible deletion rules

## Processors, regions, and transfers

For Supabase, Vercel, Google, Expo, Unleash, and every other production
provider:

- [ ] Contracting legal entity
- [ ] Service and processing purpose
- [ ] Controller/processor role
- [ ] Data categories received
- [ ] Production processing and storage regions
- [ ] Data Processing Agreement status and date
- [ ] Current subprocessor list
- [ ] International-transfer mechanism
- [ ] Transfer Impact Assessment status, where required
- [ ] Provider-specific retention and deletion behavior
- [ ] Security and breach-notification contacts

## Data-subject rights

- [ ] Identity-verification procedure for rights requests
- [ ] Request intake address and internal owner
- [ ] Access/export format
- [ ] Correction workflow
- [ ] Deletion and anonymization workflow
- [ ] Restriction and objection workflow
- [ ] Portability scope and format
- [ ] Consent-withdrawal workflow
- [ ] Response deadline tracking and extension procedure
- [ ] CNPD complaint wording and link
- [ ] Request evidence and audit-log retention

## Security and incidents

- [ ] Security owner
- [ ] Incident-response contacts
- [ ] Personal-data breach assessment procedure
- [ ] CNPD notification decision and 72-hour tracking process
- [ ] High-risk user notification process
- [ ] Access-review frequency
- [ ] Vulnerability-management and dependency-update procedure
- [ ] Production data use restrictions for development and testing
- [ ] Backup restoration and deletion verification procedure

## Required approvals before publication

- [ ] Engineering confirms the notices match deployed behavior
- [ ] Product confirms purposes and retention periods
- [ ] Security confirms technical and organizational measures
- [ ] Procurement/legal confirms processor contracts and transfers
- [ ] Qualified Portuguese/EU privacy counsel reviews the final notices and
      workflows
- [ ] An accountable controller representative approves publication
