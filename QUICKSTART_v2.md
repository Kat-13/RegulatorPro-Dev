# RegulatePro v2.0 - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Extract the Code Drop
```bash
tar -xzf regulatepro-v2-csv-import-20251020.tar.gz
cd regulatory-platform
```

### Step 2: Start the Backend
```bash
cd backend
python3.11 app.py
```
Backend will run on **http://localhost:5000**

### Step 3: Start the Frontend (in a new terminal)
```bash
cd regulatory-platform
pnpm install  # Only needed first time
pnpm dev
```
Frontend will run on **http://localhost:5173**

### Step 4: Access the Platform
- **Admin Portal:** http://localhost:5173 (login with admin@regulatepro.com / admin123)
- **Licensee Portal:** Click "Licensee" button in top-right

---

## 📥 Try CSV Import

### Use the Sample CSV
A sample CSV file is included: `sample-medical-board-license.csv`

### Import Steps:
1. Go to **Admin Portal → Form Editor**
2. Click **"New License Type"** (green button)
3. Select **"Import Document"** tab
4. Enter name: `"Test Medical Board Application"`
5. Upload the `sample-medical-board-license.csv` file
6. Click **"Import Document"**
7. View the import statistics!

### Expected Results:
- **28 total fields** imported
- **~71% field reuse** rate from UFL
- **8 new fields** added to Universal Field Library

---

## 🎯 Key Features to Test

### 1. CSV Import
- Import the sample CSV file
- Check the import statistics
- View the created form in Form Editor
- Test the form in Licensee Portal

### 2. Delete Application Type
- Select any application type (except the last one)
- Click the red **"Delete"** button
- Confirm the deletion
- Verify the type is removed

### 3. Universal Field Library
The UFL automatically tracks field usage across all application types. Fields that appear in multiple forms are reused, reducing redundancy and ensuring consistency.

---

## 📋 Sample CSV Format

Create your own CSV files using this format:

```csv
name,type,label,required,placeholder,helpText,options
first_name,text,First Name,true,Enter first name,Your legal first name,
email,email,Email Address,true,you@example.com,Contact email,
state,select,State,true,Select state,Your state,"CA,NY,TX,FL"
agree_terms,checkbox,I Agree to Terms,true,,Read and accept terms,
```

### Supported Field Types:
- `text` - Single-line text input
- `email` - Email address input
- `tel` - Phone number input
- `date` - Date picker
- `number` - Numeric input
- `textarea` - Multi-line text
- `select` - Dropdown menu (requires options)
- `radio` - Radio buttons (requires options)
- `checkbox` - Checkbox

---

## 🔧 Troubleshooting

### Backend won't start
- Ensure Python 3.11+ is installed
- Check if port 5000 is available
- Review `/tmp/backend.log` for errors

### Frontend won't start
- Ensure Node.js 22+ is installed
- Run `pnpm install` first
- Check if port 5173 is available

### CSV import fails
- Verify CSV has required columns: name, type, label, required
- Check field types are valid
- Ensure options are provided for select/radio/checkbox fields

---

## 📚 Next Steps

1. **Read the full Release Notes** (`RELEASE_NOTES_v2.md`)
2. **Create your own CSV files** for your regulatory board
3. **Explore the Universal Field Library** concept
4. **Customize forms** using the Form Editor
5. **Test the licensee application flow**

---

**Happy Building! 🎉**

