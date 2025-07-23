# 🔍 COMPREHENSIVE PATH AUDIT: M7 Discovery

## 📅 Дата: 20.01.2025
## 🏷️ ID: [production_image_serving_analysis_2025_020_path_audit]
## 🎯 Методология: IDEAL METHODOLOGY (М7) - COMPREHENSIVE PATH DISCOVERY

---

## 🚨 **MISSION: ELIMINATE ALL LEGACY PATHS**

### **Objective:**
Find and fix ALL instances of `/var/www/fonana` (lowercase) across the entire project to prevent future upload/serving issues.

### **Scope:**
- All file types: .ts, .js, .sh, .md, .json, .sql, .txt
- All directories: app/, scripts/, docs/, configs/, etc.
- Production deployment scripts
- Documentation and comments

---

## 🔍 **DISCOVERY PLAN**

### **Phase 1: Project-wide Search**
```bash
# Search all files for old path
grep -r "var/www/fonana" . --exclude-dir=node_modules --exclude-dir=.git

# Search by file types
grep -r "var/www/fonana" . --include="*.ts" --include="*.js" --include="*.sh" --include="*.md"
```

### **Phase 2: Case-insensitive Search** 
```bash
# Find all case variations
grep -ri "fonana" . | grep -i "var/www" --exclude-dir=node_modules
```

### **Phase 3: Production Scripts**
```bash
# Check deployment scripts
find . -name "*.sh" -exec grep -l "var/www" {} \;
```

**Status: DISCOVERY STARTING** 