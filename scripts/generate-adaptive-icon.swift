#!/usr/bin/env swift
//
// generate-adaptive-icon.swift
// Generates the Android adaptive icon foreground (1024×1024, with alpha).
// The Q is inset ~30% to stay within the adaptive icon safe zone (66% of canvas).
//
// Usage: swift scripts/generate-adaptive-icon.swift
// Output: assets/adaptive-icon.png
//

import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let size = 1024
let width = size
let height = size

// --- Colors from Que design system ---
let accentR: CGFloat = 167.0 / 255.0
let accentG: CGFloat = 139.0 / 255.0
let accentB: CGFloat = 250.0 / 255.0

let glowR: CGFloat = 196.0 / 255.0
let glowG: CGFloat = 181.0 / 255.0
let glowB: CGFloat = 253.0 / 255.0

// --- Setup (with alpha for adaptive icon) ---
let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
guard let ctx = CGContext(
    data: nil,
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: width * 4,
    space: colorSpace,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
    print("ERROR: Could not create CGContext")
    exit(1)
}

// Transparent background — Android supplies the background layer
ctx.clear(CGRect(x: 0, y: 0, width: width, height: height))

// --- Draw the "Q" letterform (scaled down for safe zone) ---
let centerX = CGFloat(width) / 2.0
let centerY = CGFloat(height) / 2.0

// Smaller ring to fit within the 66% safe zone
let ringOuterRadius: CGFloat = 220.0
let ringInnerRadius: CGFloat = 165.0

let ringGradientColors = [
    CGColor(srgbRed: glowR, green: glowG, blue: glowB, alpha: 1.0),
    CGColor(srgbRed: accentR, green: accentG, blue: accentB, alpha: 1.0),
    CGColor(srgbRed: accentR * 0.7, green: accentG * 0.6, blue: accentB * 0.85, alpha: 1.0)
] as CFArray
let ringGradientLocations: [CGFloat] = [0.0, 0.5, 1.0]

// Main Q ring
ctx.saveGState()
let ringPath = CGMutablePath()
ringPath.addEllipse(in: CGRect(x: centerX - ringOuterRadius, y: centerY - ringOuterRadius, width: ringOuterRadius * 2, height: ringOuterRadius * 2))
ringPath.addEllipse(in: CGRect(x: centerX - ringInnerRadius, y: centerY - ringInnerRadius, width: ringInnerRadius * 2, height: ringInnerRadius * 2))
ctx.addPath(ringPath)
ctx.clip(using: .evenOdd)

if let ringGradient = CGGradient(colorsSpace: colorSpace, colors: ringGradientColors, locations: ringGradientLocations) {
    ctx.drawLinearGradient(ringGradient, start: CGPoint(x: centerX - ringOuterRadius, y: centerY + ringOuterRadius), end: CGPoint(x: centerX + ringOuterRadius, y: centerY - ringOuterRadius), options: [])
}
ctx.restoreGState()

// Q tail
ctx.saveGState()
let tailWidth: CGFloat = 55.0
let tailStartX = centerX + 62.0
let tailStartY = centerY - 62.0
let tailEndX = centerX + 200.0
let tailEndY = centerY - 200.0

let tailAngle = atan2(tailEndY - tailStartY, tailEndX - tailStartX)
let perpX = -sin(tailAngle) * tailWidth / 2.0
let perpY = cos(tailAngle) * tailWidth / 2.0

let tailPath = CGMutablePath()
tailPath.move(to: CGPoint(x: tailStartX + perpX, y: tailStartY + perpY))
tailPath.addLine(to: CGPoint(x: tailEndX + perpX, y: tailEndY + perpY))
tailPath.addArc(center: CGPoint(x: tailEndX, y: tailEndY), radius: tailWidth / 2.0, startAngle: tailAngle + .pi / 2, endAngle: tailAngle - .pi / 2, clockwise: false)
tailPath.addLine(to: CGPoint(x: tailStartX - perpX, y: tailStartY - perpY))
tailPath.closeSubpath()

ctx.addPath(tailPath)
ctx.clip()

if let tailGradient = CGGradient(colorsSpace: colorSpace, colors: ringGradientColors, locations: ringGradientLocations) {
    ctx.drawLinearGradient(tailGradient, start: CGPoint(x: centerX - ringOuterRadius, y: centerY + ringOuterRadius), end: CGPoint(x: centerX + ringOuterRadius, y: centerY - ringOuterRadius), options: [])
}
ctx.restoreGState()

// --- Save to PNG ---
guard let image = ctx.makeImage() else {
    print("ERROR: Could not create image from context")
    exit(1)
}

let outputURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    .appendingPathComponent("assets")
    .appendingPathComponent("adaptive-icon.png")

guard let dest = CGImageDestinationCreateWithURL(outputURL as CFURL, UTType.png.identifier as CFString, 1, nil) else {
    print("ERROR: Could not create image destination at \(outputURL.path)")
    exit(1)
}

CGImageDestinationAddImage(dest, image, nil)
guard CGImageDestinationFinalize(dest) else {
    print("ERROR: Could not write PNG")
    exit(1)
}

print("✓ Adaptive icon generated: \(outputURL.path) (1024×1024, with alpha)")
