# Use a modular monolith for the web application

The project will use one React frontend, one Spring Boot backend, and one PostgreSQL database. The backend will be organized into explicit business modules with layered internals and public application interfaces. This provides stronger testing boundaries than an undivided layered application without the operational and learning cost of microservices.

The application will expose versioned REST/JSON endpoints, use HTTP-only secure session cookies for browser authentication, and isolate payment behind fake and real provider adapters. TestCafe remains the primary acceptance-testing tool, with JUnit/Spring Boot tests supporting precise backend verification.
