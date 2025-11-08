# SKU Inventory Management Feature - Implementation Summary

## Overview
A comprehensive SKU inventory management system has been added to your Extract Tools page with date-based tracking, filtering, and reporting capabilities.

## Features Implemented

### 1. Database Models
- **SkuInventory** (`models/SkuInventory.js`): Stores SKU data with company, date, quantity, and user tracking
- **CompanyOrderPreference** (`models/CompanyOrderPreference.js`): Stores custom company ordering preferences

### 2. API Endpoints

#### `/api/sku-inventory` (GET, POST, DELETE)
- **GET**: Fetch SKU inventory with filters (date range, company, SKU)
- **POST**: Upload new SKU data from PDF
- **DELETE**: Delete data by specific date

#### `/api/company-order-preference` (GET, POST)
- **GET**: Retrieve custom company order
- **POST**: Save/update custom company order

#### `/api/sku-inventory-filters` (GET)
- Returns available dates and company names for filtering

#### `/api/sku-inventory-download` (POST)
- Generate and download Excel report for date range
- Uses custom company order for sheet organization

### 3. User Interface - New "SKU Inventory" Tab

The new tab includes 5 main sections:

#### A. Upload SKU Data
- Select a date for the data
- Upload PDF file
- Automatically extracts and saves data to database
- Tracks upload date and user

#### B. View SKU Inventory
- **Filters:**
  - Start Date & End Date
  - Company name dropdown
  - SKU search field
- **Display:**
  - Company-wise grouping
  - SKU name and quantity
  - Total quantity per company
  - Scrollable view for large datasets

#### C. Download Excel Report
- Select date range (start and end dates)
- Downloads Excel with:
  - Separate sheets for each company
  - Companies ordered by custom preference
  - SKU and quantity columns
  - Sorted alphabetically by SKU

#### D. Delete Data by Date
- Select a specific date from dropdown
- Deletes all SKU records for that date
- Confirmation prompt before deletion
- Soft delete (marks as deleted, doesn't remove from DB)

#### E. Custom Company Order
- **View Mode:** Shows current company order as numbered list
- **Edit Mode:** 
  - Edit company names in textarea (one per line)
  - Save or cancel changes
  - Order persists across all Excel exports

## Permissions
- Requires `isExtractSKU` feature flag enabled in company settings
- User roles: ADMIN, MANAGER, or ADMINISTRATOR only

## Data Flow

### Upload Process:
1. User selects date and PDF
2. PDF is parsed (same logic as Generate Excel tab)
3. SKU data is extracted by company
4. Data saved to database with selected date
5. Filters are refreshed

### View Process:
1. User sets filters (dates, company, SKU)
2. Click "Fetch Data"
3. Data is aggregated by company and SKU
4. Displayed with totals

### Download Process:
1. User selects date range
2. Data is fetched and aggregated
3. Companies are sorted by custom order
4. Excel is generated with separate sheets
5. File is downloaded

### Delete Process:
1. User selects date from dropdown
2. Confirmation dialog appears
3. All records for that date are soft-deleted
4. Filters and data are refreshed

## Technical Details

### Security
- All endpoints use `authMiddleware` for authentication
- Role-based access control
- Feature flag validation

### Database Indexes
- Compound indexes on `company + selectedDate`
- Indexes on `companyName`, `sku`, `isDeleted`
- Efficient querying for date ranges

### UI/UX
- Responsive design with Tailwind CSS
- Loading states for all async operations
- Success/error messages
- Disabled states when feature is off
- Form validation

## Files Created/Modified

### New Files:
1. `models/SkuInventory.js` - Database model
2. `models/CompanyOrderPreference.js` - Preference model
3. `pages/api/sku-inventory.js` - Main CRUD API
4. `pages/api/company-order-preference.js` - Order preference API
5. `pages/api/sku-inventory-filters.js` - Filter options API
6. `pages/api/sku-inventory-download.js` - Excel download API

### Modified Files:
1. `pages/extract-sku.js` - Added new tab and functionality
2. `pages/api/extractSkuExcel.js` - Fixed custom order sorting (bug fix)

## Usage Instructions

1. **Enable Feature**: Admin must enable `isExtractSKU` flag for company
2. **Upload Data**: 
   - Go to "SKU Inventory" tab
   - Select the date for your data
   - Upload PDF file
   - Wait for processing
3. **View Data**:
   - Set date filters
   - Optionally filter by company or SKU
   - Click "Fetch Data"
4. **Download Report**:
   - Set start and end dates
   - Click "Download Excel"
5. **Manage Order**:
   - Scroll to "Custom Company Order"
   - Click "Edit Order"
   - Modify list (one company per line)
   - Click "Save Order"
6. **Delete Old Data**:
   - Select date from dropdown in "Delete Data" section
   - Confirm deletion

## Default Company Order
```
SHREEJI#
SHREEJI NEW
Cosmetic King
AKIRA_FASHION
Gajanand_Enterprise
ZXRIZ
JEWELL SWERA CREATION
BHAKTI CREATION
LA'KAILASHA
ghanshyam_enterprise
FOREIGN FALCON
HAYAAT ENTERPRISE
SERENA JEWELLERY
SAHJANAND ENTERPRISSE
NORDIC CREATION
KARMA_ENTERPRISE
SUVRAT ENTERPRISE
SAHAJ JEWELLERY
JAY KHODAL CREATION
SUNSHINECREATION
Ornexa Enterprise
```

## Future Enhancements (Optional)
- Drag-and-drop reordering for company list
- Export to CSV option
- Bulk delete for multiple dates
- Data comparison between date ranges
- Charts/graphs for visualization
- Edit existing records
- Import from Excel/CSV
- Automated reports via email

