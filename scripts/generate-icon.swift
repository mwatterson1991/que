#!/usr/bin/env swift
//
// generate-icon.swift
// Generates the Que app icon (1024×1024, no alpha) using Core Graphics.
//
// Usage: swift scripts/generate-icon.swift
// Output: assets/icon.png
//

import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let size = 1024
let width = size
let height = size

// --- Colors from Que design system ---
// Background: deep dark (#0b0b0f)
let bgR: CGFloat = 11.0 / 255.0
let bgG: CGFloat = 11.0 / 255.0
let bgB: CGFloat = 15.0 / 255.0

// Accent purple (#a78bfa)
let accentR: CGFloat = 167.0 / 255.0
let accentG: CGFloat = 139.0 / 255.0
let accentB: CGFloat = 250.0 / 255.0

// Lighter accent for glow (#c4b5fd)
let glowR: CGFloat = 196.0 / 255.0
let glowG: CGFloat = 181.0 / 255.0
let glowB: CGFloat = 253.0 / 255.0

// --- Setup ---
let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
guard let ctx = CGContext(
    data: nil,
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: width * 4,
    space: colorSpace,
    bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
) else {
    print("ERROR: Could not create CGContext")
    exit(1)
}

// --- Background: subtle radial gradient ---
ctx.setFillColor(CGColor(srgbRed: bgR, green: bgG, blue: bgB, alpha: 1.0))
ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))

// Radial gradient: subtle lighter center
let gradientColors = [
    CGColor(srgbRed: 0.10, green: 0.08, blue: 0.16, alpha: 1.0),
    CGColor(srgbRed: bgR, green: bgG, blue: bgB, alpha: 1.0)
] as CFArray
let gradientLocations: [CGFloat] = [0.0, 1.0]
if let gradient = CGGradient(colorsSpace: colorSpace, colors: gradientColors, locations: gradientLocations) {
    let center = CGPoint(x: width / 2, y: height / 2)
    ctx.drawRadialGradient(gradient, startCenter: center, startRadius: 0, endCenter: center, endRadius: CGFloat(width) * 0.7, options: .drawsAfterEndLocation)
}

// --- Draw the "Q" letterform ---
// We'll draw a geometric Q: a circle with a diagonal tail stroke

let centerX = CGFloat(width) / 2.0
let centerY = CGFloat(height) / 2.0
let ringOuterRadius: CGFloat = 280.0
let ringInnerRadius: CGFloat = 210.0

// Outer glow: a larger, blurred ring
ctx.saveGState()
let glowColor = CGColor(srgbRed: accentR, green: accentG, blue: accentB, alpha: 0.15)
ctx.setShadow(offset: .zero, blur: 60, color: glowColor)
let outerGlowPath = CGMutablePath()
outerGlowPath.addEllipse(in: CGRect(x: centerX - ringOuterRadius, y: centerY - ringOuterRadius, width: ringOuterRadius * 2, height: ringOuterRadius * 2))
outerGlowPath.addEllipse(in: CGRect(x: centerX - ringInnerRadius, y: centerY - ringInnerRadius, width: ringInnerRadius * 2, height: ringInnerRadius * 2))
ctx.addPath(outerGlowPath)
ctx.clip(using: .evenOdd)
ctx.setFillColor(CGColor(srgbRed: accentR, green: accentG, blue: accentB, alpha: 1.0))
ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
ctx.restoreGState()

// Main Q ring with gradient fill
ctx.saveGState()
let ringPath = CGMutablePath()
ringPath.addEllipse(in: CGRect(x: centerX - ringOuterRadius, y: centerY - ringOuterRadius, width: ringOuterRadius * 2, height: ringOuterRadius * 2))
ringPath.addEllipse(in: CGRect(x: centerX - ringInnerRadius, y: centerY - ringInnerRadius, width: ringInnerRadius * 2, height: ringInnerRadius * 2))
ctx.addPath(ringPath)
ctx.clip(using: .evenOdd)

// Linear gradient on the ring (top-left to bottom-right)
let ringGradientColors = [
    CGColor(srgbRed: glowR, green: glowG, blue: glowB, alpha: 1.0),
    CGColor(srgbRed: accentR, green: accentG, blue: accentB, alpha: 1.0),
    CGColor(srgbRed: accentR * 0.7, green: accentG * 0.6, blue: accentB * 0.85, alpha: 1.0)
] as CFArray
let ringGradientLocations: [CGFloat] = [0.0, 0.5, 1.0]
if let ringGradient = CGGradient(colorsSpace: colorSpace, colors: ringGradientColors, locations: ringGradientLocations) {
    ctx.drawLinearGradient(ringGradient, start: CGPoint(x: centerX - ringOuterRadius, y: centerY + ringOuterRadius), end: CGPoint(x: centerX + ringOuterRadius, y: centerY - ringOuterRadius), options: [])
}
ctx.restoreGState()

// Q tail: diagonal stroke from inside the ring going down-right
ctx.saveGState()
let tailWidth: CGFloat = 70.0
let tailStartX = centerX + 80.0
let tailStartY = centerY - 80.0  // CG coordinates (y-up), so this is below center visually
let tailEndX = centerX + 260.0
let tailEndY = centerY - 260.0

// Build the tail as a rotated rectangle path
let tailAngle = atan2(tailEndY - tailStartY, tailEndX - tailStartX)
let perpX = -sin(tailAngle) * tailWidth / 2.0
let perpY = cos(tailAngle) * tailWidth / 2.0

let tailPath = CGMutablePath()
tailPath.move(to: CGPoint(x: tailStartX + perpX, y: tailStartY + perpY))
tailPath.addLine(to: CGPoint(x: tailEndX + perpX, y: tailEndY + perpY))

// Rounded end
tailPath.addArc(center: CGPoint(x: tailEndX, y: tailEndY), radius: tailWidth / 2.0, startAngle: tailAngle + .pi / 2, endAngle: tailAngle - .pi / 2, clockwise: false)

tailPath.addLine(to: CGPoint(x: tailStartX - perpX, y: tailStartY - perpY))
tailPath.closeSubpath()

ctx.addPath(tailPath)
ctx.clip()

// Same gradient on the tail
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
    .appendingPathComponent("icon.png")

guard let dest = CGImageDestinationCreateWithURL(outputURL as CFURL, UTType.png.identifier as CFString, 1, nil) else {
    print("ERROR: Could not create image destination at \(outputURL.path)")
    exit(1)
}

CGImageDestinationAddImage(dest, image, nil)
guard CGImageDestinationFinalize(dest) else {
    print("ERROR: Could not write PNG")
    exit(1)
}

print("✓ Icon generated: \(outputURL.path) (1024×1024, no alpha)")
