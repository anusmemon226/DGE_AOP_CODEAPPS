# Common Application Layout

## Purpose

This section defines the common layout and navigation elements used across all Annual Operating Plan screens.

## Application Identity

### Main Application Name

Digital Connect

### Sub Application Name

Annual Operating Plan

## Common Layout Structure

All screens shall use a consistent application layout consisting of:

* Sidebar navigation
* Header
* Main content area

## Sidebar Navigation

The sidebar shall display links based on user role permissions.

### Sidebar Links

| Link                       | Visibility                             |
| -------------------------- | -------------------------------------- |
| Dashboard                  | All Roles                              |
| Create Activity            | AOP - Division Member                  |
| Sector / Division Overview | All Roles                              |
| Activity Leads             | All Roles                              |
| Activities List            | All Roles                              |
| Approvals                  | All Roles except AOP - Division Member |
| Procurement Plan           | All Roles                              |
| Engagement Plan            | All Roles                              |
| Financial Spending         | All Roles                              |

## Overview Link Naming Rule

The overview link name shall change based on user role.

| Role                     | Sidebar Label              |
| ------------------------ | -------------------------- |
| AOP - Division Member    | Division Overview          |
| AOP - Division Director  | Division Overview          |
| AOP - Executive Director | Sector Overview            |
| AOP - Strategy Team      | Sector / Division Overview |
| AOP - PMO                | Sector / Division Overview |
| AOP - Procurement Team   | Sector / Division Overview |
| AOP - Director General   | Sector / Division Overview |

## Header Components

The header may contain the following common controls:

| Component               | Purpose                                                 |
| ----------------------- | ------------------------------------------------------- |
| Role Changing Dropdown  | Allows switching/testing role context                   |
| Cycle Changing Dropdown | Allows changing active AOP cycle                        |
| Theme Mode Switcher     | Allows switching between Dark and Light mode            |
| Notification Panel      | Displays alerts, approvals, clarifications, and updates |
| Language Dropdown       | Allows changing application language                    |

Placement of these controls in the sidebar or header may be decided during UI implementation based on usability and design suitability.

## Common Business Rules

* Common layout shall be available on all authenticated screens.
* Sidebar links shall respect role permissions.
* Create Activity link shall only be visible to AOP - Division Member.
* Approvals link shall not be visible to AOP - Division Member.
* Cycle selector shall control data shown across screens.
* Theme mode shall apply across the complete application.
* Language selection shall apply across supported labels and UI text.
* Notification panel shall be accessible from the common layout.
* Role changing dropdown shall be available based on implementation requirement.
