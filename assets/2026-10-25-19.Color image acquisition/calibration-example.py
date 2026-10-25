"""Recompute section 19.7 using NumPy only. Run this file beside calibration-data.json.

Input: the book's 24 scanner RGB averages, D50 XYZ reference values and six gray levels.
Both fits map a column vector of linearized device RGB to XYZ, normalized to Y=1.
The Lab fit minimizes squared CIE76 residuals on the calibration set, not held-out error.
"""
from pathlib import Path
import json
import numpy as np


def xyz_to_lab(xyz, white):
    relative = np.asarray(xyz) / white
    delta = 6.0 / 29.0
    f = np.where(relative > delta ** 3, np.cbrt(relative),
                 relative / (3 * delta ** 2) + 4.0 / 29.0)
    return np.column_stack((116 * f[:, 1] - 16,
                            500 * (f[:, 0] - f[:, 1]),
                            200 * (f[:, 1] - f[:, 2])))


def unpack(parameters, white):
    ab = np.asarray(parameters).reshape(3, 2)
    return np.column_stack((ab, white - ab.sum(axis=1)))


def fit_lab(q, reference_xyz, white, initial_matrix):
    """Damped Gauss-Newton, with the white constraint enforced by parameterization."""
    reference_lab = xyz_to_lab(reference_xyz, white)

    def residual(p):
        return (xyz_to_lab(q @ unpack(p, white).T, white) - reference_lab).ravel()

    p = initial_matrix[:, :2].ravel().copy()
    damping = 1e-3
    for iteration in range(200):
        r = residual(p)
        jac = np.empty((r.size, p.size))
        for k in range(p.size):
            step = 1e-6 * max(1.0, abs(p[k]))
            offset = np.zeros_like(p)
            offset[k] = step
            jac[:, k] = (residual(p + offset) - residual(p - offset)) / (2 * step)
        if np.linalg.norm(jac.T @ r, ord=np.inf) < 1e-7:
            break
        diagonal = np.maximum(np.linalg.norm(jac, axis=0), 1.0)
        lhs = np.vstack((jac, np.sqrt(damping) * np.diag(diagonal)))
        rhs = np.concatenate((-r, np.zeros(p.size)))
        change = np.linalg.lstsq(lhs, rhs, rcond=None)[0]
        candidate = p + change
        new_r = residual(candidate)
        if new_r @ new_r < r @ r:
            p = candidate
            damping = max(damping / 3.0, 1e-12)
            if np.linalg.norm(change) < 1e-10:
                break
        else:
            damping *= 10.0
    return unpack(p, white), iteration + 1


def calculate(data):
    raw = np.array(data["scanner_rgb"], dtype=float)
    reference = np.array(data["reference_xyz_d50"], dtype=float) / 100.0
    white = np.array(data["white_xyz_d50"], dtype=float) / 100.0
    reflectance = np.array(data["gray_reflectance"], dtype=float)
    gray_codes = raw[18:][::-1]
    # No extrapolation is needed for the published data; reject out-of-range samples.
    assert np.all(raw >= gray_codes.min(axis=0))
    assert np.all(raw <= gray_codes.max(axis=0))
    q = np.column_stack([np.interp(raw[:, k], gray_codes[:, k], reflectance)
                         for k in range(3)])
    design = np.column_stack((q[:, 0] - q[:, 2], q[:, 1] - q[:, 2]))
    matrix_xyz = np.empty((3, 3))
    for row in range(3):
        target = reference[:, row] - white[row] * q[:, 2]
        ab = np.linalg.lstsq(design, target, rcond=None)[0]
        matrix_xyz[row] = [ab[0], ab[1], white[row] - ab.sum()]
    matrix_lab, iterations = fit_lab(q, reference, white, matrix_xyz)
    report = {"linearized_rgb": q.tolist(), "white": white.tolist(),
              "matrix_xyz": matrix_xyz.tolist(), "matrix_lab": matrix_lab.tolist(),
              "lab_iterations": iterations}
    for label, matrix in (("xyz", matrix_xyz), ("lab", matrix_lab)):
        prediction = q @ matrix.T
        de = np.linalg.norm(xyz_to_lab(prediction, white) -
                            xyz_to_lab(reference, white), axis=1)
        report[label] = {"mean_de76": float(de.mean()),
                         "max_de76": float(de.max()),
                         "worst_patch": int(de.argmax() + 1),
                         "gray_max_de76": float(de[18:].max()),
                         "white_output": (matrix @ np.ones(3)).tolist(),
                         "patch1_xyz": prediction[0].tolist(),
                         "errors": de.tolist()}
        assert np.allclose(matrix @ np.ones(3), white, atol=1e-12)
        assert np.all(prediction > 0)
    return report


if __name__ == "__main__":
    data_path = Path(__file__).with_name("calibration-data.json")
    result = calculate(json.loads(data_path.read_text(encoding="utf-8")))
    print(json.dumps(result, indent=2))
