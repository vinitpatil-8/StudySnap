# 📚 StudySnap

### Your notes. Your deadline. Your plan.

StudySnap is a lightweight, dependency-free study planning web app designed to help students turn a large syllabus and limited study time into a practical, actionable study plan.

Built for a friend who often knows **what** needs to be studied but struggles with deciding **what to study first and how to divide the available time**.

---

## ✨ Features

### 🎯 Personalized Study Plans
Enter your subject, notes or syllabus, available study time, and exam date to generate a structured study plan.

### 📋 Priority Topics
StudySnap identifies the topics provided in your notes and organizes them into a practical order for studying.

### ✅ Revision Checklist
Turn the generated plan into an actionable checklist and track completed study tasks.

### ⏱️ Focus Mode
Start a focused countdown for individual study sessions and work through your plan one block at a time.

### 🚨 Emergency Exam Mode
Preparing at the last minute? Emergency Mode focuses the plan around rapid revision, priorities, and practice.

### ⚡ Quick Start
Use preset scenarios such as:

- Exam tomorrow
- Exam in 3 days
- 2-hour study session
- 30-minute revision

### 💾 Previous Plans
Previously generated plans can be stored locally and reopened later.

### 📊 Progress Tracking
Track how much of your current study plan has been completed.

### 📱 Responsive Design
StudySnap works across desktop, tablet, and mobile screen sizes.

---

## 💡 The Problem

Students often don't have a lack of resources.

They have **too many resources and too little time**.

When an exam is approaching, a student might have:

- A large syllabus
- Notes scattered across different places
- Limited hours available
- Multiple topics to cover
- No clear idea where to start

StudySnap focuses on one simple question:

> **"What should I study right now?"**

---

## 🧑‍🤝‍🧑 Built for a Friend

StudySnap was created as part of the **Hacktoberfest 2026 — Build for a Friend** challenge.

The goal was not to build a huge productivity platform.

Instead, the project focuses on solving one small but real problem for one person: turning an overwhelming syllabus into a manageable study session.

---

## 🛠️ Technology

StudySnap intentionally uses a simple technology stack:

- **HTML5**
- **CSS3**
- **JavaScript**
- **LocalStorage**

No frameworks.

No package installation.

No database.

No build step.

The application can be run directly from the browser.

---

## 📁 Project Structure

```text
StudySnap/
│
├── index.html      # Main application interface
├── styles.css      # Styling and responsive design
├── app.js          # Application logic and interactions
├── README.md       # Project documentation
└── .gitignore      # Git configuration
```

---

## 🚀 Getting Started

### Option 1 — Run Locally

Clone the repository:

```bash
git clone https://github.com/vinitpatil-8/StudySnap.git
```

Move into the project:

```bash
cd StudySnap
```

Then open:

```text
index.html
```

in your browser.

That's it.

### Option 2 — VS Code

1. Clone the repository.
2. Open the project folder in VS Code.
3. Open `index.html`.
4. Use your preferred local browser preview or simply open the file in a browser.

No `npm install` is required.

---

## 📝 How to Use

### 1. Enter Your Subject

Example:

```text
Digital Electronics
```

### 2. Add Your Notes or Syllabus

Example:

```text
Number Systems
Boolean Algebra
Logic Gates
K-Maps
Combinational Circuits
Sequential Circuits
```

### 3. Enter Available Study Time

For example:

```text
2 hours
```

### 4. Enter Your Exam Date

Choose the date of your upcoming exam.

### 5. Generate Your Plan

StudySnap creates a structured study session based on the information provided.

---

## 🎯 Example

### Input

```text
Subject:
Digital Electronics

Topics:
Boolean Algebra
Logic Gates
K-Maps
Combinational Circuits

Available Time:
2 hours
```

### Output

```text
Today's Study Plan

35 min — Boolean Algebra
30 min — K-Maps
25 min — Combinational Circuits
10 min — Break
15 min — Revision
5 min — Practice Questions
```

The exact plan depends on the information supplied by the user.

---

## 🔒 Privacy

StudySnap is designed to keep the application simple and local.

User progress and saved plans use browser `localStorage`.

There is no user account system or application database.

---

## 🌱 Why Open Innovation?

The project was designed around the idea that useful AI-powered tools should remain understandable, customizable, and accessible to developers.

An open approach can provide developers with greater freedom to:

- Understand how the underlying technology works
- Modify the application
- Experiment with different models or approaches
- Customize the experience for a specific user
- Reduce dependence on a single closed platform

StudySnap keeps the rest of the application intentionally simple so that its implementation can be inspected and modified easily.

---

## 🧪 Validation

The project has been checked for:

- JavaScript syntax errors
- Git whitespace errors using `git diff --check`
- Basic application functionality
- Responsive interface behavior
- Local persistence

---

## 🏆 Hacktoberfest 2026

StudySnap was created for:

**Hacktoberfest Weekend Challenge — Build for a Friend**

The project focuses on the challenge theme by building a small tool around a real problem experienced by a friend.

---

## 🔗 Repository

GitHub:

**https://github.com/vinitpatil-8/StudySnap**

---

## 🔮 Future Ideas

Possible future improvements include:

- Local open-weight AI integration
- PDF syllabus import
- Calendar integration
- More advanced study analytics
- Voice input
- Personalized learning history
- Offline AI inference

These are intentionally outside the scope of the current lightweight version.

---

## ❤️ Built for a Friend

StudySnap started with a simple idea:

> You don't always need another productivity system.  
> Sometimes you just need someone—or something—to tell you what to do next.

Built with ❤️ for Hacktoberfest 2026.