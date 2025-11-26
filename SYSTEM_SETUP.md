# RegulatorPro System Setup Documentation

**Last Updated**: November 26, 2025  
**Branch**: `feature/smart-form-v2`  
**Environment**: Manus Sandbox (Local Development)

---

## 📍 System Architecture

### **Frontend (React + Vite)**
- **Location**: `/home/ubuntu/RegulatorPro-Dev/`
- **Port**: 5173
- **Public URL**: `https://5173-il8ahvphl45ebyegku7xd-18318e58.manusvm.computer`
- **Framework**: React 18 with Vite 6.3.5
- **Package Manager**: pnpm

### **Backend (Flask)**
- **Location**: `/home/ubuntu/RegulatorPro-Dev/backend/`
- **Port**: 5000
- **URL**: `http://localhost:5000` (not publicly exposed)
- **Framework**: Flask 2.3.3
- **Python Version**: 3.11.0rc1

### **Database (SQLite)**
- **Location**: `/home/ubuntu/RegulatorPro-Dev/backend/instance/regulatory_platform.db`
- **Backup**: `/home/ubuntu/RegulatorPro-Dev/backend/instance/regulatory_platform_backup_20251123_032110.db`
- **Size**: 624KB (as of Nov 23, 2025)
- **Type**: SQLite3

---

## 🔑 Environment Variables & Configuration

### **Backend Environment Variables**
Located in: `/home/ubuntu/RegulatorPro-Dev/backend/.env`

```bash
# OpenAI API Key (for gpt-4o PDF parsing)
OPENAI_API_KEY=your-openai-api-key-here

# Database (leave blank for SQLite)
DATABASE_URL=

# Security
SECRET_KEY=regulatory-platform-secret-key-2024
```

**⚠️ Important**: The `.env` file is in `.gitignore` and NOT committed to Git.

### **Database Configuration**
- **Config File**: `/home/ubuntu/RegulatorPro-Dev/backend/app.py` (lines 27-35)
- **Connection String**: `sqlite:///regulatory_platform.db`
- **Instance Folder**: Flask automatically uses `instance/` folder for SQLite databases

### **CORS Configuration**
- **Allowed Origins** (in `app.py` line 34):
  - `http://localhost:5173`
  - `http://localhost:5174`
  - Manus proxy URLs

---

## 🚀 Startup Procedures

### **Starting Backend**
```bash
cd /home/ubuntu/RegulatorPro-Dev/backend
OPENAI_API_KEY='<your-key>' python3.11 app.py > /tmp/backend.log 2>&1 &
```

**Check if running**:
```bash
ps aux | grep "python.*app.py" | grep -v grep
```

**View logs**:
```bash
tail -f /tmp/backend.log
```

**Stop backend**:
```bash
kill $(lsof -ti:5000)
```

### **Starting Frontend**
```bash
cd /home/ubuntu/RegulatorPro-Dev
ulimit -n 65536
pnpm run dev > /tmp/frontend.log 2>&1 &
```

**Check if running**:
```bash
ps aux | grep vite | grep -v grep
```

**View logs**:
```bash
tail -f /tmp/frontend.log
```

**Stop frontend**:
```bash
pkill -f vite
```

### **Quick Start (Both Servers)**
```bash
# Start backend
cd /home/ubuntu/RegulatorPro-Dev/backend && \
OPENAI_API_KEY='your-openai-api-key-here' \
python3.11 app.py > /tmp/backend.log 2>&1 &

# Start frontend
cd /home/ubuntu/RegulatorPro-Dev && \
ulimit -n 65536 && \
pnpm run dev > /tmp/frontend.log 2>&1 &

# Wait and check
sleep 3 && echo "✅ Backend:" && tail -3 /tmp/backend.log && \
echo "✅ Frontend:" && tail -3 /tmp/frontend.log
```

---

## 👤 User Accounts

### **Admin Account**
- **Email**: `admin@regulatepro.com`
- **Password**: `admin123`
- **Role**: Admin
- **Access**: Full system access

### **Test Licensee Account**
- Check database for additional test accounts

---

## 📂 Project Structure

```
/home/ubuntu/RegulatorPro-Dev/
├── backend/
│   ├── app.py                          # Main Flask application
│   ├── .env                            # Environment variables (NOT in Git)
│   ├── .env.example                    # Template for .env
│   ├── requirements.txt                # Python dependencies
│   ├── Procfile                        # Railway deployment config
│   ├── railway.json                    # Railway deployment config
│   ├── instance/
│   │   └── regulatory_platform.db      # SQLite database (MAIN)
│   ├── auth_utils.py                   # Authentication utilities
│   ├── document_utils.py               # Document handling
│   ├── rule_engine.py                  # Conditional logic engine
│   ├── csv_parser.py                   # CSV parsing
│   ├── purpose_matcher.py              # Field matching
│   ├── format_converter.py             # Format conversion
│   └── ...
├── src/
│   ├── components/
│   │   ├── SmartFormParserV2.jsx       # PDF parser (GPT-4o)
│   │   ├── FormRenderer.jsx            # Form display component
│   │   ├── FormStructureEditor.jsx     # Field editor
│   │   ├── FormEditor.jsx              # Manual form builder
│   │   ├── KanbanBoard.jsx             # Application types board
│   │   └── ...
│   ├── App.jsx                         # Main React app
│   └── main.jsx                        # Entry point
├── package.json                        # Node dependencies
├── vite.config.js                      # Vite configuration
├── vercel.json                         # Vercel deployment config
├── WORKFLOW_ANALYSIS.md                # System workflow documentation
└── SYSTEM_SETUP.md                     # This file

```

---

## 🔧 Key Components

### **SmartFormParserV2**
- **Location**: `/home/ubuntu/RegulatorPro-Dev/src/components/SmartFormParserV2.jsx`
- **Purpose**: Parse PDF forms using GPT-4o vision API
- **Features**:
  - PDF upload and parsing
  - Edit Mode (field editing)
  - Preview Mode (form preview)
  - Conditional logic
  - 10 field types (text, email, tel, date, number, textarea, radio, checkbox, file, signature)
  - Save to Kanban (draft Application Types)

### **Backend API Endpoints**
- **Base URL**: `http://localhost:5000/api`
- **Key Endpoints**:
  - `POST /api/parse-pdf-v2` - Parse PDF with GPT-4o
  - `POST /api/application-types` - Create application type
  - `GET /api/application-types` - List application types
  - `POST /api/auth/login` - User login
  - `GET /api/users` - List users
  - `GET /api/profiles` - List profiles
  - `GET /api/license-applications` - List applications

### **Database Models**
- **ApplicationType** - Application form definitions
- **User** - User accounts
- **Profile** - User profiles
- **LicenseApplication** - Submitted applications
- **Payment** - Payment records
- **Field** - Universal Field Library (UFL)
- **Entity** - Regulatory entities

---

## 🐛 Known Issues & Workarounds

### **Issue 1: Database Path Confusion**
- **Problem**: Backend looks for `regulatory_platform.db` in multiple locations
- **Solution**: Database is in `instance/` folder - Flask handles this automatically
- **Don't**: Manually copy database files

### **Issue 2: Frontend Stops Running**
- **Problem**: Vite server stops after inactivity
- **Solution**: Restart with `pnpm run dev`
- **Workaround**: Increase `ulimit -n 65536` before starting

### **Issue 3: API Key Not Persisting**
- **Problem**: OpenAI API key lost after sandbox restart
- **Solution**: Set as environment variable when starting backend
- **Note**: `.env` file exists but `load_dotenv()` was reverted due to login issues

### **Issue 4: Save to Kanban Not Working**
- **Problem**: Frontend sends wrong data format to backend
- **Status**: Identified but not fixed yet
- **Details**: Frontend sends `form_definition` but backend expects `sections`

---

## 📝 Recent Changes (Nov 26, 2025)

### **Completed**
1. ✅ Added signature field type (10th field type)
2. ✅ Fixed conditional logic UI
3. ✅ Added checkbox options support
4. ✅ Improved field editor modal (clearer labels)
5. ✅ Renamed "Fill Mode" → "Preview", "Export" → "Save"
6. ✅ Created workflow analysis document
7. ✅ Added deployment configuration files (Railway, Vercel)

### **Reverted**
1. ❌ `.env` file support with `load_dotenv()` - Caused login failures

### **In Progress**
1. 🔄 Fix Save to Kanban functionality (data format mismatch)
2. 🔄 Fee configuration UI
3. 🔄 Publish workflow from Kanban

---

## 🔐 Security Notes

- **API Keys**: Stored in `.env` file (not committed to Git)
- **Session Management**: Flask sessions with SECRET_KEY
- **CORS**: Restricted to localhost and Manus proxy URLs
- **Database**: SQLite (not suitable for production - migrate to PostgreSQL for deployment)

---

## 🚢 Deployment Configuration (Not Yet Deployed)

### **Railway (Backend + Database)**
- Config files ready: `Procfile`, `railway.json`
- PostgreSQL support added to `app.py`
- Not deployed yet - waiting for decision

### **Vercel (Frontend)**
- Config file ready: `vercel.json`
- Not deployed yet - waiting for decision

---

## 📞 Support & Maintenance

### **Git Repository**
- **URL**: `https://github.com/Kat-13/RegulatorPro-Dev.git`
- **Branch**: `feature/smart-form-v2`
- **Last Commit**: Revert ".env file support for persistent API key storage"

### **Logs**
- **Backend**: `/tmp/backend.log`
- **Frontend**: `/tmp/frontend.log`

### **Troubleshooting**
1. **Can't login**: Check if backend is running, verify database exists
2. **PDF parsing fails**: Check OpenAI API key is set, verify backend logs
3. **Frontend won't load**: Check port 5173 is free, restart Vite
4. **Database errors**: Verify `instance/regulatory_platform.db` exists

---

## ✅ Quick Health Check

```bash
# Check all services
echo "=== Backend ===" && ps aux | grep "python.*app.py" | grep -v grep
echo "=== Frontend ===" && ps aux | grep vite | grep -v grep
echo "=== Database ===" && ls -lh /home/ubuntu/RegulatorPro-Dev/backend/instance/*.db
echo "=== Ports ===" && lsof -i:5000 && lsof -i:5173
```

---

**End of Documentation**
