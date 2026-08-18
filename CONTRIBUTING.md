# Contributing to CivicPulse 👥

Thank you for your interest in contributing to CivicPulse! This document provides instructions for setting up your development workspace, following our standards, and submitting contributions.

---

## 🛠 Workspace Setup

1. **Fork & Clone** the repository.
2. **Backend Setup:**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   ```

---

## 🌿 Branching Policy

Use clear prefixes for your branch names:
- `feat/` for new features (e.g. `feat/citizen-rating-system`)
- `fix/` for bug fixes (e.g. `fix/jwt-expiration-handler`)
- `docs/` for documentation changes (e.g. `docs/api-specs`)
- `refactor/` for code refactoring with no behavior change
- `chore/` for build scripts, dependency updates, configuration

---

## 💬 Commit Message Standards

We follow the **Conventional Commits** specification:

```
<type>(<scope>): <description>

[optional body]
```

### Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Examples:
- `feat(auth): add OAuth2 login endpoints`
- `fix(ai): resolve division-by-zero quality score error`
- `docs(readme): update setup prerequisites`

---

## 📄 Pull Request Guidelines

Before submitting a Pull Request, ensure:
1. The code builds/compiles without errors.
2. Python style conforms to PEP 8 (use `ruff` or `black` formatting).
3. Frontend code passes ESLint rules.
4. You have updated any related documentation (e.g. README, API docs).
5. All local tests pass.

### PR Description Template:
Please fill out the `.github/PULL_REQUEST_TEMPLATE.md` when raising a PR.
