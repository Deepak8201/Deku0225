# Test Scenario: Create and Verify School

## Overview
- **Test Name**: Create and Verify School
- **Objective**: Validate the complete workflow of creating a new school, verifying it appears in the school list, viewing its details, and confirming all entered data is correctly saved and displayed
- **Preconditions**: 
  - Application is accessible at http://localhost:8090/
  - User has permissions to create schools
  - Application is in a clean state ready for testing

## Test Data Requirements
- **School Name**: Text + number format (e.g., "Test School 123") - should be randomly generated to ensure uniqueness
- **School Type**: Random selection from available options (e.g., Charter, Public, Private)
- **Education Level**: Random selection from available options (e.g., Primary, Secondary, Higher)
- **Student Capacity**: Numeric value (e.g., 5, 100, 500)
- **City**: Text value (e.g., "Pune", "Mumbai", "Delhi")
- **Country**: Text value (e.g., "India", "USA", "UK")
- **Address**: Text value (e.g., "Somewhere address", "123 Main Street")

## Test Steps

### Step 1: Navigate to Application Home Page
**Page**: Home Page
**Action**: 
- Open application URL: http://localhost:8090/

**Expected Result**:
- Home page loads successfully
- Main navigation menu is visible
- "Schools" link is available in the navigation

### Step 2: Navigate to Schools Section
**Page**: Home Page
**Action**: 
- Click on the "Schools" link in the navigation menu

**Expected Result**:
- Schools list page loads
- Page displays existing schools (if any)
- "Create New School" button/link is visible

### Step 3: Open School Creation Form
**Page**: Schools List Page
**Action**: 
- Click on the "+ Create New School" link

**Expected Result**:
- School creation form page loads
- Form displays all required fields:
  - School Name field (marked as required with *)
  - School Type dropdown
  - Education Level dropdown
  - Student Capacity numeric field
  - City field (marked as required with *)
  - Country field (marked as required with *)
  - Address field (marked as required with *)
- "Create School" button is visible

### Step 4: Enter School Name
**Page**: School Creation Form
**Action**: 
- Click on the "School Name *" textbox
- Enter randomly generated school name in format: text + number (e.g., "Test School 123")

**Expected Result**:
- Field accepts the input
- Entered text is visible in the field
- No validation errors appear

### Step 5: Select School Type
**Page**: School Creation Form
**Action**: 
- Click on the "School Type" dropdown
- Select a random option from the available list (e.g., "Charter")

**Expected Result**:
- Dropdown opens showing available school types
- Selected value is displayed in the dropdown
- Selection is confirmed

### Step 6: Select Education Level
**Page**: School Creation Form
**Action**: 
- Click on the "Education Level" dropdown
- Select a random option from the available list (e.g., "Secondary")

**Expected Result**:
- Dropdown opens showing available education levels
- Selected value is displayed in the dropdown
- Selection is confirmed

### Step 7: Enter Student Capacity
**Page**: School Creation Form
**Action**: 
- Click on the "Student Capacity" numeric field
- Enter a numeric value (e.g., "5")

**Expected Result**:
- Field accepts numeric input
- Entered number is visible in the field
- No validation errors appear

### Step 8: Enter City
**Page**: School Creation Form
**Action**: 
- Click on the "City *" textbox
- Enter a city name (e.g., "Pune")

**Expected Result**:
- Field accepts the input
- Entered text is visible in the field
- No validation errors appear

### Step 9: Enter Country
**Page**: School Creation Form
**Action**: 
- Tab from City field to Country field (or click on "Country *" textbox)
- Enter a country name (e.g., "India")

**Expected Result**:
- Focus moves to Country field
- Field accepts the input
- Entered text is visible in the field
- No validation errors appear

### Step 10: Enter Address
**Page**: School Creation Form
**Action**: 
- Click on the "Address *" textbox
- Enter an address (e.g., "Somewhere address")

**Expected Result**:
- Field accepts the input
- Entered text is visible in the field
- No validation errors appear
- All required fields are now filled

### Step 11: Submit School Creation
**Page**: School Creation Form
**Action**: 
- Click on the "Create School" button

**Expected Result**:
- Form is submitted
- Page navigates to Schools List page
- Success message may appear (if implemented)
- Newly created school appears in the list

### Step 12: Locate Created School in List
**Page**: Schools List Page
**Action**: 
- Find the newly created school in the list by searching for the school name (e.g., "Test School 123")
- Click on the school name text to verify it's visible

**Expected Result**:
- Created school is visible in the schools list
- School name matches the entered value
- School row contains action buttons/links

### Step 13: Open School Details
**Page**: Schools List Page
**Action**: 
- Click on the details/view button (info icon button) in the action column for the created school

**Expected Result**:
- School details page loads
- Page displays comprehensive information about the school
- All entered data fields are visible

### Step 14: Verify School Details
**Page**: School Details Page
**Action**: 
- Review all displayed school information
- Compare displayed data with the data entered during creation

**Expected Result**:
- School Name matches the entered value (e.g., "Test School 123")
- School Type matches the selected value (e.g., "Charter")
- Education Level matches the selected value (e.g., "Secondary")
- Student Capacity matches the entered value (e.g., "5")
- City matches the entered value (e.g., "Pune")
- Country matches the entered value (e.g., "India")
- Address matches the entered value (e.g., "Somewhere address")
- All data is correctly saved and displayed

### Step 15: Return to Schools List
**Page**: School Details Page
**Action**: 
- Click on the "Back to List" link

**Expected Result**:
- Page navigates back to Schools List page
- Schools list is displayed
- Created school is still visible in the list

## Verification Points

1. **School Creation Success**: Verify that the school creation form accepts all required data and successfully creates a new school record
2. **Data Persistence**: Verify that all entered data is correctly saved to the database
3. **List Display**: Verify that the newly created school appears in the schools list immediately after creation
4. **School Name Visibility**: Verify that the school name is searchable/findable in the list
5. **Details Page Navigation**: Verify that clicking on the school details button navigates to the correct school's details page
6. **Data Accuracy - School Name**: Verify that the School Name displayed on the details page exactly matches the value entered during creation
7. **Data Accuracy - School Type**: Verify that the School Type displayed on the details page exactly matches the value selected during creation
8. **Data Accuracy - Education Level**: Verify that the Education Level displayed on the details page exactly matches the value selected during creation
9. **Data Accuracy - Student Capacity**: Verify that the Student Capacity displayed on the details page exactly matches the value entered during creation
10. **Data Accuracy - City**: Verify that the City displayed on the details page exactly matches the value entered during creation
11. **Data Accuracy - Country**: Verify that the Country displayed on the details page exactly matches the value entered during creation
12. **Data Accuracy - Address**: Verify that the Address displayed on the details page exactly matches the value entered during creation
13. **Navigation Flow**: Verify that the "Back to List" link correctly returns to the schools list page

## Expected Final State
- A new school record exists in the system with all entered data correctly saved
- The school is visible in the schools list
- All school details are accurately displayed on the details page
- User is returned to the schools list page
- System is ready for additional operations on the created school or creation of new schools
