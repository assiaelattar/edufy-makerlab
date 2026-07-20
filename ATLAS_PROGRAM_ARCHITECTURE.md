# Atlas Adaptive Program Architecture

Last updated: 2026-07-19

## Objective

Give education organizations one coherent model for weekly academy programs, camps, one-day workshops, bootcamps, school terms, rotating shifts, and custom schedules without creating a different database design for every tenant.

The setup experience should feel like an autopilot: the operator answers plain operational questions, sees a calendar and commercial preview, then publishes a registration-ready offer.

## Current Constraint

The current `Program` model nests packs, grades, and groups, while each group owns only one `day + time`. Enrollment stores an academic-year string and attendance is not grounded in a generated class occurrence.

This creates several ambiguities:

- A program definition is mixed with a dated edition of the program.
- A group is both a roster and a schedule.
- One group cannot naturally carry multiple weekly times or date exceptions.
- Camps and extra weeks need duplicated or improvised groups.
- Pricing packs are coupled to program structure instead of a commercial offer.
- Attendance cannot reliably answer which actual workshop occurrence was attended.
- The word `session` currently means academic year in some places and class meeting in others.

## Canonical Model

```txt
Program
  reusable catalog definition

ProgramRun
  dated edition or intake of a program

ProgramGroup
  roster, capacity, instructor, room, and delivery identity

ScheduleBlock
  recurring or explicit timing attached to a run/group

ClassOccurrence
  one generated dated meeting used by attendance and delivery

PricingOffer
  what a family can buy

EnrollmentAgreement
  commercial agreement with one family/learner

EnrollmentItem
  selected run, week, group, or add-on inside the agreement

AttendanceRecord
  learner status for one ClassOccurrence
```

Use explicit names:

- `academicPeriod`: school year or term.
- `programRun`: a dated offering or intake.
- `classOccurrence`: one real meeting on the calendar.

Do not reuse `session` for all three concepts.

## Core Entities

### Program

Reusable teaching/product definition:

- `organizationId`
- name, description, category, audience, age range
- format preset: weekly, camp, bootcamp, workshop, school term, custom
- learning outcomes, requirements, media, default duration
- status and visibility

### ProgramRun

One dated edition:

- `organizationId`, `programId`, `academicPeriodId`
- name, start date, end date, timezone
- enrollment open/close dates
- location/campus
- status: draft, open, full, running, completed, canceled
- default capacity and waitlist behavior

Examples:

- Summer Maker Camp / Week 1
- Robotics 2026 / September intake
- AI Bootcamp / March evening intake
- Grade 5 / 2026-2027

### ProgramGroup

Roster and delivery unit inside a run:

- `organizationId`, `programId`, `programRunId`
- name, level/track, capacity
- instructor IDs, room/resource IDs
- status and waitlist count

A group does not own one hard-coded day/time. It references one or more schedule blocks.

### ScheduleBlock

Supports recurring and explicit schedules:

- recurring: weekdays, start/end time, recurrence window
- date list: selected dates for irregular workshops
- shift: morning, afternoon, evening, or tenant label
- room, instructor, timezone
- exclusions: holidays, canceled dates
- overrides: changed time, room, or instructor

Examples:

- Every Monday and Wednesday, 17:00-19:00
- Every weekday during one camp week, 09:00-12:00
- Saturdays for eight weeks, 10:00-15:00
- March 5, 7, 12, and 14 with different shifts

### ClassOccurrence

Materialized dated meeting generated from schedule blocks:

- `organizationId`, `programRunId`, `groupId`, `scheduleBlockId`
- date, startsAt, endsAt, timezone
- room, instructor IDs
- status: scheduled, completed, canceled, rescheduled
- source occurrence when used as a makeup
- delivery notes and completion state

Attendance, instructor handoff, makeup sessions, and parent notifications reference this record.

### PricingOffer

Commercial offer independent from the schedule:

- `organizationId`, `programId`
- eligible run/group IDs or format rules
- name, currency, base amount
- billing mode: one-time, weekly, monthly, term, semester, annual
- included quantity: weeks, occurrences, runs, materials, or add-ons
- sales window and capacity behavior
- tax and invoice metadata
- active status

Examples:

- One camp week: MAD 1,200
- Any two camp weeks: MAD 2,100
- Bootcamp evening shift: MAD 4,500
- Monthly academy membership: MAD 650

### DiscountRule

Keep reductions explicit and auditable:

- percentage or fixed amount
- promotion, sibling, scholarship, partner, early-bird, or manual
- valid dates and eligible offers
- usage limits
- approval requirement
- reason and approving user for manual reductions

Payment installments belong to Finance and the enrollment agreement, not to the Program definition.

### EnrollmentAgreement And Items

One commercial agreement may contain several selected pieces:

- learner and household
- pricing offer and applied discounts
- agreement total, payment arrangement, status
- source registration page/campaign
- consent and document state

Each `EnrollmentItem` points to one selected run, week, group, or add-on. This allows a family to add a second camp week without duplicating the learner or corrupting one group record.

## Format Presets

Presets configure the same canonical model; they do not create separate schemas.

| Preset | Default setup |
| --- | --- |
| Weekly academy | Academic-period run, recurring weekly blocks, ongoing roster |
| Camp | One run per week, weekday schedule, multi-week bundle offers |
| Bootcamp | Fixed-period intake, configurable shift groups, milestone completion |
| One-day workshop | One run and one occurrence |
| Workshop series | Dated or recurring occurrence sequence |
| School term | Academic-period run, class groups, multi-block timetable |
| Custom | Operator chooses run, grouping, and schedule behavior |

## Enrollment Timing Policies

Program format and learner enrollment timing are separate choices.

| Policy | Behavior | Example |
| --- | --- | --- |
| Fixed run | Every learner follows the run start and end dates. Late joining may be allowed, but the shared end date does not move. | School term, dated camp, bootcamp cohort |
| Rolling membership | A learner may join during the operating window and receives an individual service end date based on a configured month duration. | StemQuest: join any day, end 12 months later |
| Modular | A family selects one or more named parts such as weeks, modules, workshops, or tracks. | Summer camp weeks, workshop bundles |

Enrollment records preserve both the enrollment creation date and the learner's service start/end dates. A rolling membership never changes the reusable Program Run dates when one learner joins.

## Academic-Year Lifecycle

- Existing Programs act as reusable setup sources; enrollments never become part of a template copy.
- Duplicating a Program opens the complete setup in draft state with a source-program reference.
- Preparing a new academic year clones selected active setups in one batch, applies the new academic-period boundaries, and creates draft Programs.
- Existing run dates are shifted when appropriate; rolling programs use the new academic-period availability window while each learner still receives personal membership dates.
- Hard delete is allowed only when no enrollment history references the Program. Programs with history are archived so learner, attendance, and finance records remain valid.
- A source Program and target academic period may have only one rollover copy unless an operator explicitly creates a separate duplicate.

## Autopilot Setup Experience

### 1. Format

Ask: “What are you running?”

Choose weekly program, camp, bootcamp, workshop, school term, or custom. Show a one-sentence example rather than schema terminology.

### 2. Dates

Ask: “When can learners join?”

Set the run period, enrollment window, timezone, holidays, and optional repeated weeks/intakes. “Add another week” creates another run from the same Program.

### 3. Groups And Timetable

Ask: “When do learners attend?”

Create groups/shifts, capacity, instructors, rooms, and one or more schedule blocks. Show a calendar preview and conflicts immediately.

### 4. Offer

Ask: “What can families buy?”

Create pricing offers, included weeks/occurrences, add-ons, discounts, and the allowed payment arrangements. Preview the exact family-facing language.

### 5. Registration And Documents

Ask: “How should families join, and what should Edufy issue?”

Configure a public page, QR links, required questions, consents, confirmation, attestations, and certificate rules.

### 6. Review And Publish

Show one plain-language operational preview:

> Robotics Camp runs 20-24 July, Monday-Friday, 09:00-12:00. It has 16 seats and costs MAD 1,200. Families may add the following week for MAD 900. Registration and attendance QR codes are ready.

Publishing is blocked only by critical gaps: no valid date, schedule, capacity policy, or positive pricing offer.

## Generated Registration Pages And QR

Each ProgramRun can generate a branded, mobile-first registration page:

- unique slug and QR code
- selected run/week/shift and pricing offer
- minimal fast-registration mode: learner name, guardian name, phone, desired run
- extended mode for birth date, school, medical notes, consent, files, and custom questions
- capacity-aware availability and waitlist fallback
- source/campaign tracking per QR code
- expiration, pause, duplicate detection, and anti-spam controls
- save-and-continue link when full details are not required immediately
- confirmation page with next steps and optional payment/deposit link

QR links should be purpose-specific:

- registration QR
- event check-in QR
- attendance/self check-in QR where tenant policy allows
- certificate verification QR
- marketing campaign QR with source attribution

Public forms must never expose tenant records. Every submission is validated server-side and enters an admissions review state before becoming an active enrollment when tenant policy requires approval.

## Attestations, Certificates, And Generated Documents

### Document Templates

Tenant-branded templates should support:

- registration confirmation
- enrollment attestation
- attendance attestation
- participation attestation
- completion certificate
- achievement certificate
- invoice/receipt reference
- learner badge or program card

Templates contain brand, signatories, variables, locale, numbering pattern, background, and eligibility rules.

### Issued Documents

Every issued document records:

- `organizationId`
- template version
- learner, enrollment agreement, program, and run
- issue number and issue date
- attendance/completion evidence snapshot
- issuing user or automation
- verification token and QR code
- file URL/hash
- status: issued, replaced, revoked, expired

The public verification page reveals only minimal approved information: document type, learner display name, program/run, issue date, and validity.

### Automatic Eligibility

Rules may prepare, but not silently issue, documents based on:

- minimum attendance percentage
- completed required occurrences or milestones
- instructor approval
- completed payment policy when the tenant enables it
- completed consent/document checklist

Operators receive a “Ready to issue” queue, review the evidence, and issue documents in bulk or individually.

## Additional Program Capabilities

- Waitlist with seat promotion and expiry.
- Instructor and room conflict detection.
- Holiday, cancellation, reschedule, and makeup handling.
- Equipment/resource requirements per occurrence.
- Registration-source conversion reporting.
- Run cloning for another week, term, campus, or shift.
- Family communication triggered by schedule or occurrence changes.
- Completion dashboard for attendance, learning evidence, payments, and documents.
- Program-level custom fields without changing the canonical relational model.

## Migration Strategy

Avoid a destructive big-bang migration.

1. Add new entities alongside legacy `Program.grades[].groups` and `Enrollment.session`.
2. Create compatibility readers that expose one legacy academic-period run and one schedule block per existing group.
3. Make new programs use the autopilot model while existing MakerLab programs remain operational.
4. Migrate one real MakerLab program format at a time: weekly academy, camp, workshop, then bootcamp.
5. Add `programRunId`, `groupId`, and `enrollmentAgreementId` to new enrollments while retaining legacy fields during transition.
6. Generate class occurrences only after schedules are reviewed.
7. Move attendance to occurrence IDs, then retire ambiguous legacy session/date assumptions.

## Release Gates

- One model supports all presets without tenant-specific collections.
- Program setup can be completed without understanding database terms.
- Calendar preview matches generated occurrences.
- Capacity and conflict checks run before publish and enrollment.
- Registration page, QR, pricing, and consent all target the correct run/offer.
- Attendance is recorded against a dated occurrence.
- Certificates and attestations are evidence-backed, numbered, verifiable, and revocable.
- Legacy MakerLab programs keep working throughout migration.
