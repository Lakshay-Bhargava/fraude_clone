"""
FRAUDSCOPE AI — WCAG AA Contrast Ratio Automated Verification Test
Verifies that all design tokens and badge/indicator text-background pairs
meet the WCAG AA requirement (minimum 4.5:1 for normal body text).
"""

import pytest

def srgb_to_linear(c_srgb: float) -> float:
    return c_srgb / 12.92 if c_srgb <= 0.04045 else ((c_srgb + 0.055) / 1.055) ** 2.4

def relative_luminance(hex_code: str) -> float:
    hex_code = hex_code.lstrip('#')
    r = int(hex_code[0:2], 16) / 255.0
    g = int(hex_code[2:4], 16) / 255.0
    b = int(hex_code[4:6], 16) / 255.0
    
    r_lin = srgb_to_linear(r)
    g_lin = srgb_to_linear(g)
    b_lin = srgb_to_linear(b)
    
    return 0.2126 * r_lin + 0.7152 * g_lin + 0.0722 * b_lin

def contrast_ratio(hex1: str, hex2: str) -> float:
    lum1 = relative_luminance(hex1)
    lum2 = relative_luminance(hex2)
    l_light = max(lum1, lum2)
    l_dark = min(lum1, lum2)
    return (l_light + 0.05) / (l_dark + 0.05)

# Design Token Pairs defined in Phase 1
PAIRS = [
    ("Main text on page background", "#26221D", "#F2ECDF", 4.5),
    ("Main text on card surface", "#26221D", "#FBF7EE", 4.5),
    ("Main text on sidebar surface", "#26221D", "#E9E1D0", 4.5),
    ("Main text on table hover paper", "#26221D", "#EDE5D3", 4.5),
    ("Main text on white table cell", "#26221D", "#FFFFFF", 4.5),
    ("High risk badge text on high risk tint", "#A8341C", "#FDE8E8", 4.5),
    ("Medium risk badge text on medium risk tint", "#8A5A00", "#FEF3D6", 4.5),
    ("Low risk badge text on low risk tint", "#1D6B4F", "#E6F7F0", 4.5),
    ("Indicator chip text on indicator chip tint", "#0F6E7A", "#D8EEF0", 4.5),
    ("Accent green on card", "#2F4B45", "#FBF7EE", 4.5),
]

@pytest.mark.parametrize("name,fg,bg,min_ratio", PAIRS)
def test_wcag_contrast_pair(name, fg, bg, min_ratio):
    ratio = contrast_ratio(fg, bg)
    print(f"\n[WCAG CHECK] {name}: {fg} on {bg} => Ratio {ratio:.2f}:1 (Required: {min_ratio}:1)")
    assert ratio >= min_ratio, f"Contrast ratio {ratio:.2f} for {name} ({fg} on {bg}) is below {min_ratio}:1"

if __name__ == "__main__":
    for name, fg, bg, min_ratio in PAIRS:
        ratio = contrast_ratio(fg, bg)
        status = "PASS" if ratio >= min_ratio else "FAIL"
        print(f"[{status}] {name:45}: {fg} on {bg} -> {ratio:.2f}:1 (Target >= {min_ratio}:1)")
