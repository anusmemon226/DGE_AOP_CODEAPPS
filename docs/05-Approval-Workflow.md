# Approval Workflow Specification

# Annual Operating Plan (AOP)

---

## 1. Purpose

This document defines the approval workflow, status transitions, ownership assignments, clarification process, and approval responsibilities for AOP Activities during Planning and Execution phases.

---

## 2. Approval Statuses

| Status Code | Status Name                    |
| ----------- | ------------------------------ |
| 1           | Draft                          |
| 776140001   | Submitted to Division Director |
| 776140003   | Approved By Division Director  |
| 776140004   | Approved By Strategy Team      |
| 776140002   | Approved By Executive Director |
| 776140011   | Active                         |
| 776140012   | Clarification Needed           |
| 2           | Inactive                       |
| 776140014   | Approved By Director General   |

---

## 3. Activity Statuses

| Status Code | Status Name            |
| ----------- | ---------------------- |
| 776140014   | Draft                  |
| 776140007   | Not Started            |
| 776140006   | In Progress – On Track |
| 776140005   | In Progress – Delayed  |
| 776140009   | On Hold                |
| 776140010   | Cancelled              |
| 776140013   | Completed              |
| 776140015   | Submitted for Approval |

---

## 4. Planning Phase Workflow

### Step 1 – Activity Creation

**Actor**

AOP - Division Member

**Action**

Create Activity

**Outcome**

| Item            | Value                 |
| --------------- | --------------------- |
| Owner           | AOP - Division Member |
| Approval Status | Draft (1)             |

The activity remains in Draft status until submitted.

---

### Step 2 – Submit to Division Director

**Actor**

AOP - Division Member

**Action**

Submit Activity

**Outcome**

| Item            | Value                                      |
| --------------- | ------------------------------------------ |
| Owner           | AOP - Division Director                    |
| Approval Status | Submitted to Division Director (776140001) |

---

### Step 3 – Division Director Review

**Actor**

AOP - Division Director

**Available Actions**

* Approve
* Raise Clarification

#### Approval Outcome

| Item            | Value                                     |
| --------------- | ----------------------------------------- |
| Owner           | AOP - Strategy Team                       |
| Approval Status | Approved By Division Director (776140003) |

#### Clarification Outcome

| Item            | Value                            |
| --------------- | -------------------------------- |
| Owner           | AOP - Division Member            |
| Approval Status | Clarification Needed (776140012) |

Clarification comments are mandatory.

---

### Step 4 – Strategy Team / PMO / Procurement Team Review

**Eligible Reviewers**

* AOP - Strategy Team
* AOP - PMO
* AOP - Procurement Team

**Review becomes available when:**

Approval Status = Approved By Division Director (776140003)

**Available Actions**

* Approve
* Raise Clarification

#### Approval Outcome

| Item            | Value                                 |
| --------------- | ------------------------------------- |
| Owner           | AOP - Strategy Team                   |
| Approval Status | Approved By Strategy Team (776140004) |

**Business Rule:**

Approval by any one of the eligible reviewer roles changes the status to Approved By Strategy Team.

#### Clarification Outcome

| Item            | Value                            |
| --------------- | -------------------------------- |
| Owner           | AOP - Division Member            |
| Approval Status | Clarification Needed (776140012) |

Clarification comments are mandatory.

---

### Step 5 – Send to Executive Director

**Actor**

AOP - Strategy Team

**Action**

Send to Executive Director

**Outcome**

| Item            | Value                                 |
| --------------- | ------------------------------------- |
| Owner           | AOP - Executive Director              |
| Approval Status | Approved By Strategy Team (776140004) |

**Business Rule:**

Sending to Executive Director changes ownership only.

Approval status remains unchanged.

---

### Step 6 – Executive Director Review

**Actor**

AOP - Executive Director

**Available Actions**

* Approve
* Raise Clarification

#### Approval Outcome

| Item            | Value                                      |
| --------------- | ------------------------------------------ |
| Owner           | AOP - Director General                     |
| Approval Status | Approved By Executive Director (776140002) |

#### Clarification Outcome

| Item            | Value                            |
| --------------- | -------------------------------- |
| Owner           | AOP - Division Member            |
| Approval Status | Clarification Needed (776140012) |

Clarification comments are mandatory.

---

### Step 7 – Director General Review

**Actor**

AOP - Director General

**Available Actions**

* Approve
* Raise Clarification

#### Approval Outcome

| Item            | Value                 |
| --------------- | --------------------- |
| Owner           | AOP - Division Member |
| Approval Status | Active (776140011)    |

#### Clarification Outcome

| Item            | Value                            |
| --------------- | -------------------------------- |
| Owner           | AOP - Division Member            |
| Approval Status | Clarification Needed (776140012) |

Clarification comments are mandatory.

---

### Planning Phase Completion

Planning Phase ends when:

* Approval Status = Active (776140011)
* Owner = AOP - Division Member

Execution Phase begins for that activity.

---

## 5. Clarification Workflow Rules

### Clarification Behavior

When clarification is raised by:

* Division Director
* Strategy Team
* PMO
* Procurement Team
* Executive Director
* Director General

The following shall occur:

| Item            | Value                            |
| --------------- | -------------------------------- |
| Owner           | AOP - Division Member            |
| Approval Status | Clarification Needed (776140012) |

### Mandatory Rules

* Clarification comments are required.
* Clarification history shall be maintained.
* Clarification history shall be visible to authorized users.

### Resubmission Rule

After clarification is addressed:

The complete approval cycle restarts from the beginning.

**Example:**

Division Member

→ Division Director

→ Strategy Team

→ Clarification Raised

After resubmission:

Division Member

→ Division Director

→ Strategy Team

→ Executive Director

→ Director General

---

## 6. Execution Phase Workflow

Execution Phase starts after Planning Phase approval is completed.

### Initial Execution State

**Trigger**

Director General Approval

**Outcome**

| Item            | Value                   |
| --------------- | ----------------------- |
| Owner           | AOP - Division Member   |
| Approval Status | Active (776140011)      |
| Activity Status | Not Started (776140007) |

---

### Start Activity

**Actor**

AOP - Division Member

**Action**

Start Activity

**Outcome**

| Item            | Value                              |
| --------------- | ---------------------------------- |
| Activity Status | In Progress – On Track (776140006) |
| Approval Status | Active (776140011)                 |

---

### Submit Execution Update

**Actor**

AOP - Division Member

**Action**

Submit Activity Update

**Outcome**

| Item            | Value                                      |
| --------------- | ------------------------------------------ |
| Owner           | AOP - Division Director                    |
| Approval Status | Submitted to Division Director (776140001) |

---

### Division Director Review

#### Approval Outcome

| Item            | Value                                     |
| --------------- | ----------------------------------------- |
| Owner           | AOP - Strategy Team                       |
| Approval Status | Approved By Division Director (776140003) |

#### Clarification Outcome

| Item            | Value                            |
| --------------- | -------------------------------- |
| Owner           | AOP - Division Member            |
| Approval Status | Clarification Needed (776140012) |

Execution update fields are cleared.

---

### Strategy Team / PMO / Procurement Team Review

#### Approval Outcome

| Item            | Value                                 |
| --------------- | ------------------------------------- |
| Owner           | AOP - Strategy Team                   |
| Approval Status | Approved By Strategy Team (776140004) |

Approval by any one eligible reviewer is sufficient.

#### Clarification Outcome

| Item            | Value                            |
| --------------- | -------------------------------- |
| Owner           | AOP - Division Member            |
| Approval Status | Clarification Needed (776140012) |

Execution update fields are cleared.

---

### Send to Executive Director

**Actor**

AOP - Strategy Team

**Outcome**

| Item            | Value                                 |
| --------------- | ------------------------------------- |
| Owner           | AOP - Executive Director              |
| Approval Status | Approved By Strategy Team (776140004) |

Approval status remains unchanged.

---

### Executive Director Review

#### Approval Outcome

| Item            | Value                 |
| --------------- | --------------------- |
| Owner           | AOP - Division Member |
| Approval Status | Active (776140011)    |

#### Clarification Outcome

| Item            | Value                            |
| --------------- | -------------------------------- |
| Owner           | AOP - Division Member            |
| Approval Status | Clarification Needed (776140012) |

Execution update fields are cleared.

---

## 7. Execution Phase Business Rules

* Director General is not part of the Execution approval workflow.
* Strategy Team may review and approve execution updates.
* PMO may review and approve execution updates.
* Procurement Team may review and approve execution updates.
* Approval by any one of the eligible reviewers results in Approved By Strategy Team status.
* Execution updates can be submitted multiple times during the activity lifecycle.
* Clarification always returns ownership to Division Member.
* Clarification always requires comments.
* Execution update data shall be cleared whenever clarification is raised.

---

## 8. Workflow Summary

### Planning Phase

Division Member

→ Division Director

→ Strategy Team / PMO / Procurement Team

→ Strategy Team Sends to Executive Director

→ Executive Director

→ Director General

→ Active

### Execution Phase

Division Member

→ Division Director

→ Strategy Team / PMO / Procurement Team

→ Strategy Team Sends to Executive Director

→ Executive Director

→ Active