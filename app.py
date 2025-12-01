from flask import Flask, render_template, request, jsonify
import analysis
import io
import base64

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/plot', methods=['POST'])
def plot():
    try:
        data = request.json
        raw_rows = data.get('data', [])
        headers = data.get('headers', [])
        title = data.get('title', 'Graph')
        axis_labels = data.get('axis_labels', {'x': 'Time', 'y': 'Voltage'})
        annotations = data.get('annotations', [])
        
        # Parse data into columns
        # Expected raw_rows: [[val1, val2, ...], [val1, val2, ...]]
        # We assume the first column is always X-axis (Time)
        
        if not raw_rows or not headers:
             return jsonify({'error': 'No data provided'}), 400

        # Transpose data to get columns
        # Handle potential empty strings or bad values
        parsed_columns = []
        for col_idx in range(len(headers)):
            col_data = []
            for row in raw_rows:
                try:
                    val = float(row[col_idx]) if col_idx < len(row) and row[col_idx] != '' else 0.0
                    col_data.append(val)
                except ValueError:
                    col_data.append(0.0)
            parsed_columns.append(col_data)

        if not parsed_columns:
            return jsonify({'error': 'No valid data found'}), 400

        x_data = parsed_columns[0]
        y_series = []
        
        # Create series for plotting
        for i in range(1, len(parsed_columns)):
            series_name = headers[i]
            y_data = parsed_columns[i]
            
            # Generate smooth curve data or line of best fit using RANSAC
            smooth_x, smooth_y, is_straight = analysis.get_best_fit_curve(x_data, y_data)
            
            # Calculate slope
            slope = analysis.calculate_slope(x_data, y_data)
            
            y_series.append({
                'name': series_name, 
                'data': y_data, # Raw data for markers
                'smooth_x': smooth_x,
                'smooth_y': smooth_y,
                'slope': slope
            })

        # Find intersection only when appropriate
        # Show slopes instead for:
        # 1. Single straight line
        # 2. Multiple non-intersecting straight lines
        intersection = None
        if len(y_series) == 2:
            # Check if both series are straight lines
            is_line1_straight = analysis.is_straight_line(x_data, y_series[0]['data'])
            is_line2_straight = analysis.is_straight_line(x_data, y_series[1]['data'])
            
            # Check if they're non-intersecting
            non_intersecting = analysis.check_non_intersecting(x_data, y_series[0]['data'], y_series[1]['data'])
            
            # Only calculate intersection if:
            # - At least one line is NOT straight (curved lines may intersect), OR
            # - Both are straight but they DO intersect
            if (not is_line1_straight or not is_line2_straight) or (is_line1_straight and is_line2_straight and not non_intersecting):
                intersection = analysis.find_intersection(x_data, y_series[0]['data'], y_series[1]['data'])

        # Return raw data for client-side plotting
        return jsonify({
            'x_data': x_data,
            'series': y_series,
            'intersection': intersection,
            'layout': {
                'title': title,
                'xaxis': {'title': axis_labels.get('x', 'Time')},
                'yaxis': {'title': axis_labels.get('y', 'Voltage')}
            }
        })

    except Exception as e:
        print(f"Error: {e}") # Debug
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, use_reloader=False)
