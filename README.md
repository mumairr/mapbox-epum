# Mapbox-Epum

This project integrates a **Mapbox** map viewer with custom data layers from ArcGIS Rest services, geocoder with reverse geocoding capabilities, and few dynamic custom written controls. The application has two branches:

1. **Master**: Runs as two separate applications: a **Vite (React)** frontend and a **Flask** backend.
2. **Dockerized**: Both frontend and backend are set up to run using **Docker** for simplified deployment.

## Features

- **Interactive Map**: Built on tope of vite with Mapbox and React, allowing users to explore, interact with, and download specific data layers.
- **Geocoder & Reverse Geocoder**: Users can search for locations by name or coordinates, and the reverse geocoder allows querying locations based on map clicks.
- **Custom Layer Switcher**: A completley custom-written layer control (populates from backend app) allows users to toggle map layers, zoom to layer, groups them as per categories, with multi-select. Lazy loads layer only on visibility 
- **Dynamically Generated Legend**: The map legend is completely custom written and dynamically created based on the visible layers, providing real-time information (for now, only top 2 layers in Stormdrain category have style associated / written, rest are all default).
- **Zoom-to-Layer Button**: Users can zoom to specific layers directly using the icon in front ot it, improving map navigation and interaction, if layer hasn't been turned on, it turns layer on as well as zooms to it
- **Spinning Globe Feature**: A spinning globe visualization adds a dynamic 3D spinning effect for aesthetic and functional appeal, just for aesthetics. It can be turned off by spin globe switch in bottom right corner.
- **Base Layer Switcher**: Users can switch between different base layers (e.g., satellite, streets) to customize their view (bottom right corner).
- **ArcGIS REST Services**: The project integrates with **ArcGIS REST services** to fetch and display geospatial data layers in real-time.

## Project Structure

### Master Branch

- **Frontend (Vite)**:
  - Built using **React**.
  - Includes features like geocoding, reverse geocoding, custom layer control, custom legend, navigation buttons, and base layer switching.
  - Mapbox-based spinning globe view.
  - Dynamically integrates **ArcGIS REST services** to retrieve map layers.
  - Runs independently of the backend (but dependent on back-end for providing layers and serving them).

- **Backend (Flask)**:
  - REST API built with **Flask**.
  - Downloads the data when app runs initially, skips if already downloaded.
  - Provides endpoints for serving map layer data, downloads, and handling interactions with **ArcGIS REST services**.
  - Two versions of the Flask app:
    - **`app.py`**: Basic version that downloads smaller data chunks (allows to cut off data if transfer limit is exceeded, an Arc Services option).
    - **Extended app**: Downloads entire datasets (can take significant time due to the large size of datasets).
  - When the Flask app runs, it starts downloading data from the ArcGIS REST services to serve as local cache for improved performance.
  - Runs separately from the frontend.
  - Provides folder structure via txt file, which front-end uses to build whole app

### Dockerized Branch

- Combines both the **Vite** frontend and **Flask** backend into a single **Docker** container.
- Simplifies deployment by containerizing both applications for consistent environments.
- **Docker Compose** manages both frontend and backend services.

## Setup Instructions

### Master Branch (Running Vite and Flask Separately)

#### Prerequisites
- **Node.js** (for Vite frontend)
- **Python 3.x** (for Flask backend)
- **Mapbox Access Token**: Required to access the Mapbox API.

#### Frontend Setup
1. Clone the repository and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the frontend directory and add your **Mapbox Access Token**:
   ```env
   VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token
   ```
4. Run the Vite development server:
   ```bash
   npm run dev
   ```

#### Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and activate it:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Choose which Flask app to run:
   - To run the **basic** version (small dataset download):
     ```bash
    python3 app.py
     ```
   - To run the **extended** version (downloads entire dataset):
     ```bash
     flask run extended_app.py
     ```
   > Note: Running the extended app can take time as it downloads large datasets from the ArcGIS REST services.

#### Access the Application
- Visit `http://localhost:5173` for the frontend (Vite).
- Flask backend will be running on `http://localhost:5000`.

### Dockerized Branch (Running with Docker) ***** PREFERRED METHOD *****

#### Prerequisites
- **Docker** and **Docker Compose** installed on your machine.

#### Setup
1. Clone the repository and switch to the `dockerized` branch:
   ```bash
   git checkout dockerized
   ```
2. Build and run the Docker containers:
   ```bash
   docker-compose up --build
   ```

#### Access the Application
- Visit `http://localhost` for the frontend.
- The backend Flask API will be available at `http://localhost:5000`.

## Technical Specifications

- **Frontend**:
  - Framework: **React (Vite)**
  - State management: **useState** and **useEffect**
  - Map Integration: **Mapbox GL JS**
  - Features: Geocoder, reverse geocoder, layer switcher, dynamically generated legend, zoom-to-layer button, spinning globe, and base layer switcher.
  - **Environment Variables** for API keys: Stored in a `.env` file.
  - Integrates with **ArcGIS REST services** for live data.
  - Hover over feature for it's attributes information, also allows zoom button to that feature in popup

- **Backend**:
  - Framework: **Flask**
  - API Endpoints:
    - `/layers`: Serves information about available map layers.
    - `/folder-structure`: Serves folder structure information (category wise) about available map layers.
    - `/download`: Allows users to download specific data.
  - Two versions of the Flask app:
    - **`app.py`**: Basic app for smaller downloads.
    - **Extended app**: Full dataset download (takes more time).
  - **ArcGIS REST services**: Backend fetches data from ArcGIS services and provides it to the frontend.
  - **Data Handling**: Flask downloads data from ArcGIS REST services as soon as the app starts, serving as a local cache for faster access.

- **Docker**:
  - **Dockerfile** for both frontend and backend.
  - **docker-compose.yml** to manage multi-container setup.
  - Docker setup ensures consistent development environments and easy deployment.
