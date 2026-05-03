# Software Testing Report: Signup & Login
**Methodology**: Equivalence Class Partitioning (ECP) & Boundary Value Analysis (BVA)  
**Based on**: Lecture 26 - Software Testing (Rana)

This report applies the formal testing techniques from the lecture slides to the Pharmax Authentication module.

---

## 1. Equivalence Class Partitioning (ECP)

As per **Slide 16**, we partition the input domain into classes of data for which the system should behave similarly.

### A. Signup: Username Input
| Class ID | Description | Input Type | Expected Result |
| :--- | :--- | :--- | :--- |
| **EC1** | Valid username length (1 to 255 chars) | Valid | Success |
| **EC2** | Empty input (0 characters) | Invalid | "Required" Error |
| **EC3** | Exceeds DB limit (> 255 characters) | Invalid | System Rejection |

### B. Signup: Password Input
| Class ID | Description | Input Type | Expected Result |
| :--- | :--- | :--- | :--- |
| **EC4** | Valid password length (6 to 128 chars) | Valid | Success |
| **EC5** | Short password (< 6 characters) | Invalid | "Min 6 characters" Error |
| **EC6** | Empty input (0 characters) | Invalid | "Required" Error |

### C. Login: Account Security (Lockout)
| Class ID | Description | Input Type | Expected Result |
| :--- | :--- | :--- | :--- |
| **EC7** | Failed attempts (0 to 4) | Valid Range | Allow retry |
| **EC8** | Failed attempts (>= 5) | Invalid Range | "Account temporarily locked" |

---

## 2. Boundary Value Analysis (BVA)

Following the **Slide 15** pattern (Testing 0, 1, 2, n-1, n, n+1), we test the edges of the Equivalence Classes.

### A. Username Boundary Tests (Target: 1-255 chars)
| Test Case ID | Input Length | Boundary Type | Expected Result |
| :--- | :--- | :--- | :--- |
| **BVA-U1** | 0 characters | Below Min | Validation Error |
| **BVA-U2** | 1 character | Minimum | Success |
| **BVA-U3** | 2 characters | Just Above Min | Success |
| **BVA-U4** | 254 characters | Just Below Max | Success |
| **BVA-U5** | 255 characters | Maximum | Success |
| **BVA-U6** | 256 characters | Above Max | Rejection/Truncation |

### B. Password Boundary Tests (Target: 6-128 chars)
| Test Case ID | Input Length | Boundary Type | Expected Result |
| :--- | :--- | :--- | :--- |
| **BVA-P1** | 0 characters | Below Min | Validation Error |
| **BVA-P2** | 5 characters | Just Below Min | Validation Error |
| **BVA-P3** | 6 characters | Minimum | Success |
| **BVA-P4** | 7 characters | Just Above Min | Success |
| **BVA-P5** | 128 characters | Maximum | Success |
| **BVA-P6** | 129 characters | Above Max | Potential Error |

---

## 3. Formal Test Cases (Slide 5 Format)

| Test Case ID | Purpose | Input Data | Expected Output | Actual Output | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Verify min password length | User: `admin`, Pass: `12345` | "Min 6 characters" | "Min 6 characters" | **PASS** |
| **TC-02** | Verify mandatory username | User: `""`, Pass: `Valid123` | "Required" | "Required" | **PASS** |
| **TC-03** | Verify account lockout trigger | 5 incorrect login attempts | "Account temporarily locked" | "Account temporarily locked" | **PASS** |
| **TC-04** | Verify case sensitivity | User: `Admin` (DB: `admin`) | "Invalid credentials" | "Invalid credentials" | **PASS** |

---

## 4. Observations on Testing Severity (Slide 8)
- **Failure to Login (Correct Credentials)**: **Critical Severity** (Major system damage/access loss).
- **Broken Lockout Mechanism**: **Major Severity** (Security risk).
- **Missing "Required" message**: **Minor Severity** (User confusion but no data loss).

---
*Report generated in accordance with Lecture 26 Testing Guidelines.*
