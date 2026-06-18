# Airbus A320 Interactive Cockpit Systems Simulator

This project is an interactive, high-fidelity web-based cockpit simulator for the **Airbus A320**, specifically designed to demonstrate the operation, logic, and failures of four critical aircraft systems:

1.  **Pneumatics (ATA 36)**: Purge distribution from engines (IP/HP stages) and APU, automatic Crossbleed valve logic, and pressure/temperature regulation.
2.  **Air Conditioning (ATA 21)**: Pack flow control valves, stacked compressor/bypass temperature CRT dials, and cabin/cockpit temperature regulation.
3.  **Ice & Rain Protection (ATA 30)**: Thermal pneumatic Wing Anti-Ice (WAI) with direccional flow indicators and Engine Anti-Ice (EAI).
4.  **Hydraulic Power (ATA 29)**: Symmetrical Green, Blue, and Yellow 3000 PSI networks, engine-driven pumps (EDP), electric pumps, and automatic Power Transfer Unit (PTU) fail-safe backup.

Developed as an academic dashboard, the interface maps directly to cockpit **Overhead Panels** (with zero-latency Korry buttons and mechanical rotaries) and the **ECAM System Display (SD)** CRT pages.

---

## Features

-   **High-Fidelity CRT Schematics**: All pages are rendered using clean SVG vector graphics, matching the classic Airbus classroom diagrams.
-   **Dark Cockpit Philosophy**: Buttons conform to official Airbus logic (lights-out = normal automatic operation; white = OFF; blue = active overrides; amber = FAULT).
-   **Dynamic Systems Physics**: Fluid pressures, temperatures, fuel burn, electrical loads, and altitude climb rates are computed in real time.
-   **Fault Injection Panel**: Enables testing system tolerances by triggering engine flameouts, APU fires, reservoir leaks, icing conditions, and duct leaks, activating the Master Warning/Caution alerts.
-   **PTU Redundancy Simulation**: Automatically triggers power transfer between Yellow and Green systems when pressure drops below 2500 PSI, restoring flight controls without fluid mixing.

---

## File Structure

The project is fully static and self-contained:
-   `index.html`: Contains the structural layout of the cockpit panels, SVG diagrams, and instructor controls.
-   `styles.css`: Styles the dark cockpit theme, Korry button glow effects, dial alignments, and responsive layout scaling.
-   `script.js`: Computes the systems physics engine, state machines, and dynamic DOM updates.

---

## How to Deploy on GitHub Pages

Since this is a fully static application, it can be hosted for free on GitHub Pages. Follow these steps to set it up:

### 1. Initialize a Clean Git Repository
Make sure you initialize the repository **only** in the folder containing these files (do not push your entire document directory):
```bash
# Create a new directory and copy the files inside
mkdir a320-systems-simulator
cp index.html styles.css script.js README.md a320-systems-simulator/
cd a320-systems-simulator

# Initialize git
git init
git add .
git commit -m "Initial commit: A320 Systems Simulator"
```

### 2. Push to GitHub
1.  Go to [GitHub](https://github.com/) and create a new repository named `a320-systems-simulator` (set it to **Public**).
2.  Link your local repository to GitHub and push:
    ```bash
    git remote add origin https://github.com/YOUR_GITHUB_USERNAME/a320-systems-simulator.git
    git branch -M main
    git push -u origin main
    ```

### 3. Enable GitHub Pages
1.  Navigate to your repository on the GitHub website.
2.  Click on **Settings** (top bar).
3.  On the left sidebar, click on **Pages**.
4.  Under **Build and deployment** -> **Branch**, select `main` (or `master`) and folder `/ (root)`.
5.  Click **Save**.

Your interactive simulator will be live at `https://YOUR_GITHUB_USERNAME.github.io/a320-systems-simulator/` in a few minutes. You can share this link directly with your professor to view and interact with the simulator.
