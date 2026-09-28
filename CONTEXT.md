# Movie Ticket Management System Context

This repository contains the university project, its supporting requirements and planning documents, and its verification assets.

## Project language

**Project repository**:
The Git repository containing the movie-ticket application and its academic project materials.
_Avoid_: workspace, random folder

**Test case**:
A documented test scenario with preconditions, steps, test data, and expected results for one verifiable behavior.
_Avoid_: test note, checklist item

**Test artifact**:
Generated evidence or output from test execution, such as screenshots, videos, and reports.
_Avoid_: test case, test specification

**Project document**:
A source requirement, planning, design, or report file used to explain or manage the university project.
_Avoid_: generated artifact

**Business module**:
A cohesive area of project behavior with its own responsibilities, rules, and public interfaces, such as Booking or Payment.
_Avoid_: microservice, technical folder

**Modular monolith**:
A single deployable application whose business behavior is separated into explicit internal modules.
_Avoid_: microservices, one giant undivided application

**Application contract**:
The agreed interface through which one module requests behavior from another module.
_Avoid_: direct repository access, hidden dependency

**Test environment**:
An isolated runtime and database used to execute automated tests without changing development data.
_Avoid_: production environment, developer database
