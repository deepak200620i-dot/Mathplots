import numpy as np
from scipy.interpolate import CubicSpline
from sklearn.linear_model import RANSACRegressor, LinearRegression

def find_intersection(times, charge_v, discharge_v):
    """
    Finds the intersection point of charging and discharging curves using Cubic Spline interpolation.
    Returns a dict with 'time' and 'voltage'.
    """
    times = np.array(times)
    charge_v = np.array(charge_v)
    discharge_v = np.array(discharge_v)

    if len(times) < 2:
        return None

    # Create cubic splines for both curves
    cs_charge = CubicSpline(times, charge_v)
    cs_discharge = CubicSpline(times, discharge_v)

    # Define difference function
    def diff_func(t):
        return cs_charge(t) - cs_discharge(t)

    # Find roots of the difference function
    # We iterate through intervals to find sign changes, then use a root finder
    # Since we want a robust solution without too many dependencies, we can use 
    # scipy.optimize.brentq if available, or just high-res sampling.
    # Let's use high-res sampling + linear interpolation on the difference for simplicity and speed
    # or use CubicSpline's roots method if we construct a spline of the difference.
    
    cs_diff = CubicSpline(times, charge_v - discharge_v)
    roots = cs_diff.roots()

    # Filter roots to be within the time range
    valid_roots = [r for r in roots if times[0] <= r <= times[-1]]

    if not valid_roots:
        return None

    # Take the first valid root
    t_intersect = valid_roots[0]
    v_intersect = cs_charge(t_intersect)

    return {'time': round(float(t_intersect), 4), 'voltage': round(float(v_intersect), 4)}

def interpolate_curve(times, values, num_points=500):
    """
    Generates high-resolution points for a smooth curve using Cubic Spline.
    Returns (smooth_times, smooth_values).
    """
    times = np.array(times)
    values = np.array(values)
    
    if len(times) < 2:
        return times.tolist(), values.tolist()
        
    cs = CubicSpline(times, values)
    smooth_times = np.linspace(times[0], times[-1], num_points)
    smooth_values = cs(smooth_times)
    
    return smooth_times.tolist(), smooth_values.tolist()

def calculate_slope(x, y):
    """
    Calculates the slope of the line of best fit for the given data points.
    Returns the slope as a float, rounded to 4 decimal places.
    """
    x = np.array(x)
    y = np.array(y)
    
    if len(x) < 2:
        return 0.0
        
    # Fit a linear polynomial (degree 1)
    # Returns [slope, intercept]
    slope, intercept = np.polyfit(x, y, 1)
    
    return round(float(slope), 4)

def is_straight_line(x, y, tolerance=0.01):
    """
    Determines if the data points form a straight line.
    Uses R² (coefficient of determination) to check linearity.
    Returns True if R² > (1 - tolerance), indicating a near-perfect linear fit.
    """
    x = np.array(x)
    y = np.array(y)
    
    if len(x) < 2:
        return False
    
    # Fit a linear model
    slope, intercept = np.polyfit(x, y, 1)
    y_pred = slope * x + intercept
    
    # Calculate R² (coefficient of determination)
    ss_res = np.sum((y - y_pred) ** 2)  # Residual sum of squares
    ss_tot = np.sum((y - np.mean(y)) ** 2)  # Total sum of squares
    
    # Handle edge case where all y values are the same
    if ss_tot == 0:
        return True  # Horizontal line
    
    r_squared = 1 - (ss_res / ss_tot)
    
    return r_squared > (1 - tolerance)

def check_non_intersecting(times, y1, y2):
    """
    Checks if two data series don't intersect within the given time range.
    Returns True if the lines are non-intersecting (parallel or don't cross).
    """
    times = np.array(times)
    y1 = np.array(y1)
    y2 = np.array(y2)
    
    if len(times) < 2:
        return True
    
    # Calculate the difference between the two series
    diff = y1 - y2
    
    # Check if all differences have the same sign
    # If they do, the lines don't intersect
    all_positive = np.all(diff >= 0)
    all_negative = np.all(diff <= 0)
    
    return all_positive or all_negative

def get_linear_fit_points(x, y):
    """
    Generates points for the line of best fit.
    Returns (fit_x, fit_y) containing just the start and end points.
    """
    x = np.array(x)
    y = np.array(y)
    
    if len(x) < 2:
        return x.tolist(), y.tolist()
        
    # Fit a linear model
    slope, intercept = np.polyfit(x, y, 1)
    
    # Generate start and end points based on x range
    min_x, max_x = float(np.min(x)), float(np.max(x))
    
    fit_x = [min_x, max_x]
    fit_y = [slope * min_x + intercept, slope * max_x + intercept]
    
    return fit_x, fit_y

def get_best_fit_curve(x, y):
    """
    Uses RANSAC to determine if data should be fitted with a straight line or curve.
    Returns (fit_x, fit_y, is_straight_line).
    
    If >= 80% of points fit a straight line (inliers), returns a straight line.
    Otherwise, returns a cubic spline curve.
    """
    x = np.array(x)
    y = np.array(y)
    
    if len(x) < 2:
        return x.tolist(), y.tolist(), False
    
    # Prepare data for RANSAC (reshape x to 2D)
    X = x.reshape(-1, 1)
    
    # Use RANSAC to find the straight line that fits the maximum points
    ransac = RANSACRegressor(LinearRegression(), residual_threshold=0.05)
    ransac.fit(X, y)
    
    # Count how many points lie on the RANSAC line
    inliers = ransac.inlier_mask_
    num_inliers = inliers.sum()
    
    # If enough points lie on one straight line, treat it as straight
    STRAIGHT_LINE_THRESHOLD = 0.80  # 80% points must lie on same straight line
    
    if num_inliers / len(x) >= STRAIGHT_LINE_THRESHOLD:
        # Plot only the best-fitting straight line
        # Use first and last x for clean straight display
        line_x = np.array([x.min(), x.max()])
        line_X = line_x.reshape(-1, 1)
        line_y = ransac.predict(line_X)
        
        return line_x.tolist(), line_y.tolist(), True
    else:
        # Use cubic spline for nonlinear graphs
        smooth_x, smooth_y = interpolate_curve(x, y)
        return smooth_x, smooth_y, False
