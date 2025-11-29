import numpy as np
from scipy.interpolate import CubicSpline

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
