from flask import Flask, send_from_directory, jsonify, request
import os
from concurrent.futures import ThreadPoolExecutor
from flask_cors import CORS

app = Flask(__name__)

# Enable CORS for all routes, allowing requests from 'localhost:5173'
CORS(app, resources={r"/*": {"origins": "http://localhost"}})

# Path to the folder where GeoJSON data will be stored
GEOJSON_DIR = os.path.join(os.getcwd(), 'downloadedall')

# Create the folder if it doesn't exist
if not os.path.exists(GEOJSON_DIR):
    os.makedirs(GEOJSON_DIR)

executor = ThreadPoolExecutor(max_workers=3)

# Function to download and update the GeoJSON files (Integrated Python download logic)
def run_download_script():
    import requests
    import json
    from concurrent.futures import ThreadPoolExecutor, as_completed

    # URLs for the ArcGIS REST services
    urls = {
        'Wastewater': "https://geogimstest.houstontx.gov/arcgis/rest/services/HW/PublicOutsideWastewater/MapServer",
        'Water': "https://geogimstest.houstontx.gov/arcgis/rest/services/PublicOutsideWatertest/MapServer",
        'Stormdrain': "https://geogimstest.houstontx.gov/arcgis/rest/services/HW/Stormdrain/MapServer"
    }

    # Initialize a list to keep track of folder structure
    folder_structure = []

    # Check if data is already downloaded by checking the presence of the folder structure file
    folder_structure_path = os.path.join(GEOJSON_DIR, 'folder_structure.txt')
    if os.path.exists(folder_structure_path):
        print("Data already downloaded. Skipping download.")
        return  # Exit if data has already been downloaded

    # Function to get the list of all layers and sublayers from the service
    def get_layers(base_url):
        try:
            response = requests.get(base_url + "?f=json")
            response.raise_for_status()
            data = response.json()
            layers = data.get('layers', [])
            return layers
        except Exception as e:
            print(f"Failed to get layers from {base_url}: {e}")
            return []

   # Function to download data from a specific layer or sublayer and save it as GeoJSON
    def download_layer_data(base_url, layer_id, full_layer_name, folder_name):
        file_name = f"{folder_name}/{full_layer_name.replace(' ', '_')}.geojson"

        # Check if the layer file already exists
        if os.path.exists(file_name):
            print(f"Layer {full_layer_name} already exists. Skipping download.")
            return  # Skip the download if the file already exists

        url = f"{base_url}/{layer_id}/query"
        params = {
            'where': '1=1',  # Get all data
            'outFields': '*',  # Get all fields
            'f': 'geojson',  # Get the data in GeoJSON format for GIS compatibility
            'returnGeometry': 'true',  # Get the geometry data as well
            'resultOffset': 0,  # Start with the first record
            'resultRecordCount': 1000  # Number of records per request (adjust as needed)
        }

        all_features = []  # Store all features across paginated requests

        try:
            while True:
                response = requests.get(url, params=params)
                response.raise_for_status()
                data = response.json()

                # Check if the response contains an error or exceeded the transfer limit
                if 'error' in data:
                    print(f"Error in response for {full_layer_name} (Layer ID: {layer_id}): {data['error']}")
                    return  # Skip saving if there's an error in the response

                # Check if there are features in the response
                if 'features' in data:
                    all_features.extend(data['features'])

                    # If we get fewer records than the requested limit, we have reached the end
                    if len(data['features']) < params['resultRecordCount']:
                        break

                    # Otherwise, increase the resultOffset for the next request
                    params['resultOffset'] += params['resultRecordCount']
                else:
                    break

            # Save the full result to a GeoJSON file after paginating through all records
            if all_features:
                geojson_data = {
                    "type": "FeatureCollection",
                    "features": all_features
                }
                file_name = f"{folder_name}/{full_layer_name.replace(' ', '_')}.geojson"
                with open(file_name, 'w') as file:
                    json.dump(geojson_data, file, indent=4)

                # Add file structure to the list
                folder_structure.append(f"{folder_name}/{full_layer_name.replace(' ', '_')}.geojson")

                print(f"Data for {full_layer_name} (Layer ID: {layer_id}) downloaded successfully in {folder_name}!")
        except Exception as e:
            print(f"Failed to download data for {full_layer_name} (Layer ID: {layer_id}) in {folder_name}: {e}")

    # Helper function to construct the full layer name with numbering based on hierarchy
    def build_full_layer_name(layers_dict, layer_id, current_level=1):
        for layer in layers_dict:
            if layer['id'] == layer_id:
                parent_id = layer.get('parentLayerId')
                if parent_id is None or parent_id == -1:
                    return f"{current_level}_{layer['name']}"
                else:
                    parent_name = build_full_layer_name(layers_dict, parent_id, current_level)
                    return f"{parent_name}_{current_level + 1}_{layer['name']}"

    # Function to download all layers and sublayers data with hierarchical numbering for a specific ArcGIS REST service
    def download_all_layers_with_hierarchy(base_url, folder_name):
        try:
            if not os.path.exists(folder_name):
                os.makedirs(folder_name)

            folder_structure.append(f"{folder_name}/")

            layers = get_layers(base_url)

            if layers:
                for layer in layers:
                    layer_id = layer.get('id')
                    full_layer_name = build_full_layer_name(layers, layer_id, current_level=1)
                    download_layer_data(base_url, layer_id, full_layer_name, folder_name)
                    if 'subLayerIds' in layer and layer['subLayerIds']:
                        for sublayer_id in layer['subLayerIds']:
                            full_sublayer_name = build_full_layer_name(layers, sublayer_id, current_level=2)
                            download_layer_data(base_url, sublayer_id, full_sublayer_name, folder_name)
            else:
                print(f"No layers found for {base_url}.")
        except Exception as e:
            print(f"Error downloading layers from {base_url}: {e}")

    # Download data from all services into the 'downloaded' folder
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = []
        for folder_name, base_url in urls.items():
            full_folder_path = os.path.join(GEOJSON_DIR, folder_name)  # Save inside 'downloaded' folder
            futures.append(executor.submit(download_all_layers_with_hierarchy, base_url, full_folder_path))

        for future in futures:
            future.result()

    # Save folder structure to a text file
    with open(folder_structure_path, 'w') as f:
        f.write("\n".join(folder_structure))
    print("Folder structure saved to folder_structure.txt")


@app.route('/geojson/<path:filename>')
def serve_geojson(filename):
    """Serve GeoJSON files."""
    return send_from_directory(os.path.join(os.getcwd(), 'downloadedexceed'), filename)

@app.route('/folder-structure')
def folder_structure():
    """Return the folder structure as JSON."""
    folder_structure_file = os.path.join(os.path.join(os.getcwd(), 'downloadedexceed'), 'folder_structure.txt')
    with open(folder_structure_file, 'r') as f:
        structure = f.read().splitlines()
    return jsonify(structure)

@app.route('/download-layers', methods=['POST'])
def download_layers():
    """Endpoint to trigger the download of layers."""
    # Run the download script asynchronously
    executor.submit(run_download_script)
    return jsonify({"status": "Download started. Please refresh the page after some time."})

if __name__ == '__main__':
    # Check if data is already downloaded, run the script on startup if necessary
    run_download_script()
    app.run(debug=True)
