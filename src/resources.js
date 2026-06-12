// Registry of every database collection, organized into the sidebar sections
// where it belongs. `page` items are curated screens with custom workflows;
// `model` items are managed through the generic /admin/db API (list / search /
// edit / delete) with the columns defined here.

export const GROUPS = [
  {
    group: "Overview",
    icon: "chart",
    items: [{ page: "/", label: "Dashboard", icon: "📊", end: true }],
  },
  {
    group: "People",
    icon: "users",
    items: [
      { model: "user", label: "Employees", fields: ["phoneNumber", "basicDetails.name", "basicDetails.city", "isEmployeeVerified", "isDeleted", "createdAt"] },
      { model: "businessOwner", label: "Employers", fields: ["name", "phoneNumber", "currentCity", "walletBalance", "isVerified", "createdAt"] },
      { model: "admin", label: "Admin Accounts", fields: ["name", "phoneNumber"] },
      { model: "Aadhar", label: "Aadhaar Records", fields: ["name", "gender", "dateOfBirth", "aadharId", "isDeleted", "createdAt"] },
      { model: "pancard", label: "PAN Cards", fields: ["name", "panId", "gender", "dateOfBirth", "createdAt"] },
      { model: "voterId", label: "Voter IDs", fields: ["name", "voterId", "gender", "isDeleted", "createdAt"] },
      { model: "document", label: "ID Documents", fields: ["userId", "primaryId", "secondaryId", "companyId", "createdAt"] },
      { model: "userJourney", label: "User Journeys", fields: ["heading", "title", "category", "employeeId", "createdAt"] },
      { model: "fcmToken", label: "FCM Tokens", fields: ["deviceId", "user.type", "user.id", "createdAt"] },
      { model: "dailyEvent", label: "Daily Events", fields: ["userId", "lastEventTime", "createdAt"] },
    ],
  },
  {
    group: "Companies & Branches",
    icon: "building",
    items: [
      { model: "companiess", label: "Companies", fields: ["companyName", "companyRole", "isDeleted", "createdAt"] },
      { model: "Branch", label: "Branches", fields: ["branchCode", "branchName", "branchType", "location.city", "isActive", "isDeleted"] },
      { model: "selectedBranch", label: "Selected Branches", fields: ["userId", "companyId", "branchId", "createdAt"] },
      { model: "gst", label: "GST Records", fields: ["GSTIN", "legal_name_of_business", "state", "isLinked", "userId"] },
      { model: "fssai", label: "FSSAI Records", fields: ["fssai", "entity", "status", "state", "isLinked"] },
      { model: "otherDocument", label: "Other Documents", fields: ["documentType", "documentNumber", "verificationStatus", "isLinked", "userId"] },
      { model: "documentTypeMaster", label: "Document Types", fields: ["name", "source", "usageCount", "isActive"] },
      { model: "businessVaultDocument", label: "Business Vault", fields: ["name", "category", "ownerId", "fileType", "isDeleted"] },
    ],
  },
  {
    group: "Hiring",
    icon: "briefcase",
    items: [
      { model: "jobPostManager", label: "Job Posts", fields: ["jobTitle", "status", "paymentDone", "jobType", "isDeleted", "createdAt"] },
      { model: "jobApplicants", label: "Job Applicants", fields: ["jobPostId", "applicants", "isDeleted"] },
      { model: "jobTitle", label: "Job Titles", fields: ["title", "createdAt"] },
      { model: "offerLetter", label: "Offer Letters", fields: ["jobTitle", "salary", "status.employee", "status.employer", "startDate", "createdAt"] },
      { model: "BranchLinkRequest", label: "Branch Link Requests", fields: ["employeeId", "branchId", "status", "employeeType", "agreedSalary", "startDate"] },
    ],
  },
  {
    group: "Workforce",
    icon: "clipboard",
    items: [
      { model: "currentEmployee", label: "Current Employees", fields: ["employeeId", "branchId", "companyId", "isDeleted", "createdAt"] },
      { model: "exEmployee", label: "Ex Employees", fields: ["employeeId", "terminationReason", "terminationDate", "mobileNumber", "isDeleted"] },
      { model: "EmploymentRecord", label: "Employment Records", fields: ["employmentCode", "status", "startDate", "endDate", "agreedSalary", "employmentType"] },
      { model: "resignationRequest", label: "Resignations", fields: ["employeeId", "reason", "lastWorkingDay", "status", "requestedAt"] },
      { model: "liability", label: "Liabilities", fields: ["employeeName", "damagedItem", "itemPrice", "status", "createdAt"] },
      { model: "workVaultCard", label: "Work Vault Cards", fields: ["cardId", "title", "type", "enabled", "visible", "position"] },
      { model: "galleryPhoto", label: "Gallery Photos", fields: ["employeeId", "category", "caption", "createdAt"] },
    ],
  },
  {
    group: "Attendance & Leave",
    icon: "clock",
    items: [
      { model: "AttendanceSession", label: "Attendance Sessions", fields: ["employmentCode", "date", "status", "totalHoursWorked", "employeeId"] },
      { model: "AttendancePolicy", label: "Attendance Policies", fields: ["branchId", "shiftStart", "shiftEnd", "graceMinutes", "geofenceRadiusMeters"] },
      { model: "LeaveRequest", label: "Leave Requests", fields: ["employeeId", "type", "startDate", "endDate", "status"] },
      { model: "LeavePolicy", label: "Leave Policies", fields: ["branchId", "casualPerYear", "sickPerYear", "earnedPerYear"] },
      { model: "RegularisationRequest", label: "Regularisations", fields: ["employeeId", "date", "status", "reason", "respondedAt"] },
    ],
  },
  {
    group: "Payroll",
    icon: "banknote",
    items: [
      { model: "Payslip", label: "Payslips", fields: ["employmentCode", "period.year", "period.month", "netSalary", "status"] },
      { model: "SalaryRun", label: "Salary Runs", fields: ["branchId", "period.year", "period.month", "status", "totalEmployees", "sentCount"] },
      { model: "AdvancePay", label: "Advance Payments", fields: ["employeeId", "amount", "remainingAmount", "direction", "status"] },
    ],
  },
  {
    group: "Finance",
    icon: "wallet",
    items: [
      { model: "payment", label: "Payments", fields: ["orderId", "totalAmount", "status", "employerId", "createdAt"] },
      { model: "jobPostPayments", label: "Job Post Payments", fields: ["jobPostId", "orderId", "amount", "status", "createdAt"] },
      { model: "offerLetterPayment", label: "Offer Letter Payments", fields: ["userId", "offerId", "transactionId", "totalcost", "createdAt"] },
      { model: "jobSearchUnlockPayment", label: "Job Unlock Payments", fields: ["transactionId", "amount", "userId", "totalCost", "createdAt"] },
      { model: "EmployerSubscription", label: "Subscriptions", fields: ["ownerId", "planCode", "planName", "status", "startDate", "endDate"] },
      { model: "platformPrice", label: "Platform Prices", fields: ["jobPostFee", "hiringFee", "gst", "jobSearchUnlockedPrice"] },
      { model: "walletTransaction", label: "Wallet Transactions", fields: ["userId", "userType", "eventKey", "amount", "balanceAfter", "status"] },
      { page: "/point-rewards", label: "Point Rewards", icon: "🎁" },
      { page: "/coupons", label: "Coupons", icon: "🏷️" },
      { page: "/payments", label: "Payment Tools", icon: "💳" },
    ],
  },
  {
    group: "Moderation & Support",
    icon: "shield",
    items: [
      { page: "/verifications", label: "Verifications", icon: "✅" },
      { model: "review", label: "Reviews", fields: ["employeeId", "userId", "companyId", "createdAt"] },
      { model: "reviewQuestions", label: "Review Questions", fields: ["question", "type"] },
      { model: "support", label: "Support Tickets", fields: ["subject", "type.name", "userId", "message"] },
      { page: "/support-numbers", label: "Support Numbers", resource: "supportConfig" },
      { model: "Notification", label: "Notifications", fields: ["userModel", "type", "title", "isRead", "createdAt"] },
    ],
  },
  {
    group: "Master Data",
    icon: "layers",
    items: [
      { model: "jobRoleMaster", label: "Job Roles", fields: ["name", "usageCount", "source", "isActive"] },
      { model: "locationMaster", label: "Locations", fields: ["name", "state", "kind", "usageCount", "isActive"] },
      { model: "associationMaster", label: "Associations", fields: ["name", "source", "createdAt"] },
      { model: "associationChapter", label: "Association Chapters", fields: ["associationName", "state", "chapterName", "isActive"] },
      { model: "employerAssociation", label: "Employer Associations", fields: ["employerId", "associations", "createdAt"] },
    ],
  },
  {
    group: "App Content",
    icon: "layout",
    items: [
      { model: "HomeScreenEmployee", label: "Employee Home Screen", fields: ["language", "createdAt"] },
      { model: "jobsHomeScreen", label: "Jobs Home Screen", fields: ["language", "createdAt"] },
      { model: "EmployeeBottomBar", label: "Employee Bottom Bar", fields: ["item"] },
      { model: "businessOwnerHomeScreen", label: "Employer Home Screen", fields: ["language"] },
      { model: "businessOwnerBottomBar", label: "Employer Bottom Bar", fields: ["item"] },
      { model: "businessOwnerTheme", label: "Employer Theme", fields: ["theme"] },
      { model: "businessVaultScreen", label: "Business Vault Screen", fields: ["language", "createdAt"] },
      { model: "hiringManagmentScreen", label: "Hiring Screen", fields: ["language"] },
      { model: "workForceManagment", label: "Workforce Screen", fields: ["language"] },
      { model: "workSpaceManagment", label: "Workspace Screen", fields: ["language"] },
      { model: "icons", label: "Icons & Tags", fields: ["tagType1Icon"] },
      { model: "version", label: "App Versions", fields: ["android.latestappversion", "ios.latestappversion"] },
    ],
  },
  {
    group: "System",
    icon: "terminal",
    items: [
      { model: "apiLogs", label: "API Logs", fields: ["name", "statusCode", "route", "method", "createdAt"] },
      { page: "/access", label: "Access Manager", superOnly: true },
    ],
  },
];

// model name -> { label, fields, group }
export const RESOURCES = {};
for (const g of GROUPS) {
  for (const item of g.items) {
    if (item.model) RESOURCES[item.model] = { ...item, group: g.group };
  }
}

export const resourceFor = (model) => RESOURCES[model] || null;

// Permission resource key for a sidebar item — page path key or model name.
// Must match the keys the backend routes are gated with (see adminRoute.js).
// `resource` overrides for curated pages that manage a specific collection.
export const resourceKey = (item) =>
  item.resource || (item.model ? item.model : item.page === "/" ? "dashboard" : item.page.slice(1));
