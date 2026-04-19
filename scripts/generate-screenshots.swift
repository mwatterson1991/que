#!/usr/bin/env swift
//
//  generate-screenshots.swift
//  Generates App Store marketing screenshots for Que.
//
//  Sizes produced:
//    • 6.9" iPhone  (1320 × 2868)  — iPhone 16 Pro Max
//    • 6.5" iPhone  (1284 × 2778)  — iPhone 15 Plus / 14 Plus
//    • 12.9" iPad   (2048 × 2732)  — iPad Pro 12.9"
//
//  Usage:  swift scripts/generate-screenshots.swift
//  Output: assets/screenshots/
//

import Cocoa

// MARK: – Brand tokens ---------------------------------------------------

struct Brand {
    static let bg       = NSColor(red: 0.043, green: 0.043, blue: 0.059, alpha: 1) // #0b0b0f
    static let bgDeep   = NSColor(red: 0, green: 0, blue: 0, alpha: 1)
    static let panel    = NSColor(red: 0.082, green: 0.082, blue: 0.110, alpha: 1) // #15151c
    static let panelMid = NSColor(red: 0.110, green: 0.110, blue: 0.118, alpha: 1) // #1c1c1e
    static let border   = NSColor(red: 0.153, green: 0.153, blue: 0.165, alpha: 1) // #27272a
    static let fg       = NSColor(red: 0.961, green: 0.961, blue: 0.969, alpha: 1) // #f5f5f7
    static let fgDim    = NSColor(red: 0.443, green: 0.443, blue: 0.478, alpha: 1) // #71717a
    static let fgFaint  = NSColor(red: 0.322, green: 0.322, blue: 0.357, alpha: 1) // #52525b
    static let accent   = NSColor(red: 0.655, green: 0.545, blue: 0.980, alpha: 1) // #a78bfa
    static let success  = NSColor(red: 0.133, green: 0.773, blue: 0.369, alpha: 1) // #22c55e
    static let alarm    = NSColor(red: 1.000, green: 0.624, blue: 0.039, alpha: 1) // #ff9f0a
}

// MARK: – Device specs ----------------------------------------------------

struct DeviceSpec {
    let name: String
    let width: Int
    let height: Int
    let suffix: String
}

let devices = [
    DeviceSpec(name: "iPhone 6.9\"",  width: 1320, height: 2868, suffix: "iphone-6.9"),
    DeviceSpec(name: "iPhone 6.5\"",  width: 1284, height: 2778, suffix: "iphone-6.5"),
    DeviceSpec(name: "iPad 12.9\"",   width: 2048, height: 2732, suffix: "ipad-12.9"),
]

// MARK: – Screenshot definitions ------------------------------------------

struct Screenshot {
    let slug: String
    let headline: String
    let subline: String
    let draw: (CGContext, CGSize) -> Void   // custom art for this slide
}

// MARK: – Drawing helpers -------------------------------------------------

func fill(_ ctx: CGContext, _ rect: CGRect, _ color: NSColor) {
    ctx.setFillColor(color.cgColor)
    ctx.fill(rect)
}

func drawGradient(_ ctx: CGContext, _ rect: CGRect, from: NSColor, to: NSColor, vertical: Bool = true) {
    let cs = CGColorSpaceCreateDeviceRGB()
    guard let gradient = CGGradient(colorsSpace: cs,
                                    colors: [from.cgColor, to.cgColor] as CFArray,
                                    locations: [0, 1]) else { return }
    ctx.saveGState()
    ctx.clip(to: rect)
    if vertical {
        ctx.drawLinearGradient(gradient,
                               start: CGPoint(x: rect.midX, y: rect.maxY),
                               end: CGPoint(x: rect.midX, y: rect.minY),
                               options: [])
    } else {
        ctx.drawLinearGradient(gradient,
                               start: CGPoint(x: rect.minX, y: rect.midY),
                               end: CGPoint(x: rect.maxX, y: rect.midY),
                               options: [])
    }
    ctx.restoreGState()
}

func drawRoundedRect(_ ctx: CGContext, _ rect: CGRect, radius: CGFloat, fill color: NSColor) {
    let path = CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil)
    ctx.addPath(path)
    ctx.setFillColor(color.cgColor)
    ctx.fillPath()
}

func drawRoundedRectStroke(_ ctx: CGContext, _ rect: CGRect, radius: CGFloat, stroke color: NSColor, lineWidth: CGFloat = 2) {
    let path = CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil)
    ctx.addPath(path)
    ctx.setStrokeColor(color.cgColor)
    ctx.setLineWidth(lineWidth)
    ctx.strokePath()
}

func drawText(_ ctx: CGContext, _ text: String, at point: CGPoint, font: NSFont, color: NSColor, maxWidth: CGFloat? = nil) {
    let attrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: color,
    ]
    let str = NSAttributedString(string: text, attributes: attrs)
    let line = CTLineCreateWithAttributedString(str)
    let ascent = CTFontGetAscent(font as CTFont)
    ctx.saveGState()
    // Undo the y-flip for text rendering
    ctx.translateBy(x: point.x, y: point.y + ascent)
    ctx.scaleBy(x: 1, y: -1)
    ctx.textPosition = .zero
    CTLineDraw(line, ctx)
    ctx.restoreGState()
}

func drawWrappedText(_ ctx: CGContext, _ text: String, in rect: CGRect, font: NSFont, color: NSColor, alignment: CTTextAlignment = .center, lineSpacing: CGFloat = 0) {
    let style = NSMutableParagraphStyle()
    style.alignment = alignment == .center ? .center : (alignment == .left ? .left : .right)
    style.lineSpacing = lineSpacing
    let attrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: color,
        .paragraphStyle: style,
    ]
    let attrStr = NSAttributedString(string: text, attributes: attrs)
    let framesetter = CTFramesetterCreateWithAttributedString(attrStr)
    ctx.saveGState()
    // Undo the y-flip for CTFrameDraw (it expects native CG coords)
    ctx.translateBy(x: 0, y: rect.origin.y + rect.height)
    ctx.scaleBy(x: 1, y: -1)
    let flippedRect = CGRect(x: rect.origin.x, y: 0, width: rect.width, height: rect.height)
    let path = CGPath(rect: flippedRect, transform: nil)
    let frame = CTFramesetterCreateFrame(framesetter, CFRangeMake(0, 0), path, nil)
    CTFrameDraw(frame, ctx)
    ctx.restoreGState()
}

func drawCircle(_ ctx: CGContext, center: CGPoint, radius: CGFloat, fill color: NSColor) {
    let rect = CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2)
    ctx.setFillColor(color.cgColor)
    ctx.fillEllipse(in: rect)
}

func drawCircleStroke(_ ctx: CGContext, center: CGPoint, radius: CGFloat, stroke color: NSColor, lineWidth: CGFloat = 2) {
    let rect = CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2)
    ctx.setStrokeColor(color.cgColor)
    ctx.setLineWidth(lineWidth)
    ctx.strokeEllipse(in: rect)
}

// MARK: – Slide artwork functions -----------------------------------------

/// Slide 1: glowing orb with concentric rings — represents theta state
func drawOrbSlide(_ ctx: CGContext, _ size: CGSize) {
    let cx = size.width / 2
    let cy = size.height * 0.52
    let baseR = min(size.width, size.height) * 0.14

    // Outer glow rings
    for i in stride(from: 5, through: 1, by: -1) {
        let r = baseR + CGFloat(i) * baseR * 0.35
        let alpha = 0.06 * CGFloat(6 - i)
        let glowColor = NSColor(red: 0.655, green: 0.545, blue: 0.980, alpha: alpha)
        drawCircle(ctx, center: CGPoint(x: cx, y: cy), radius: r, fill: glowColor)
    }
    // Core orb
    drawCircle(ctx, center: CGPoint(x: cx, y: cy), radius: baseR, fill: Brand.accent)
    // Inner bright spot
    let innerColor = NSColor(red: 0.85, green: 0.78, blue: 1.0, alpha: 0.7)
    drawCircle(ctx, center: CGPoint(x: cx, y: cy - baseR * 0.15), radius: baseR * 0.45, fill: innerColor)
}

/// Slide 2: mock chat interface with message bubbles
func drawChatSlide(_ ctx: CGContext, _ size: CGSize) {
    let pad = size.width * 0.08
    let bubbleW = size.width - pad * 2
    let bubbleH = size.height * 0.055
    let startY = size.height * 0.42
    let cornerR: CGFloat = bubbleH * 0.35

    // User bubble (right-aligned, accent)
    let userW = bubbleW * 0.65
    let userRect = CGRect(x: size.width - pad - userW, y: startY, width: userW, height: bubbleH)
    drawRoundedRect(ctx, userRect, radius: cornerR, fill: Brand.accent.withAlphaComponent(0.25))
    drawRoundedRectStroke(ctx, userRect, radius: cornerR, stroke: Brand.accent.withAlphaComponent(0.4), lineWidth: 1.5)
    let userFont = NSFont.systemFont(ofSize: size.width * 0.028, weight: .medium)
    drawWrappedText(ctx, "Set my alarm for 6:30 AM", in: userRect.insetBy(dx: cornerR * 0.8, dy: bubbleH * 0.18), font: userFont, color: Brand.fg, alignment: .left)

    // Bot bubble (left-aligned, panel)
    let botY = startY + bubbleH + size.height * 0.025
    let botH = bubbleH * 1.6
    let botRect = CGRect(x: pad, y: botY, width: bubbleW * 0.78, height: botH)
    drawRoundedRect(ctx, botRect, radius: cornerR, fill: Brand.panelMid)
    drawRoundedRectStroke(ctx, botRect, radius: cornerR, stroke: Brand.border, lineWidth: 1.5)
    let botFont = NSFont.systemFont(ofSize: size.width * 0.026, weight: .regular)
    drawWrappedText(ctx, "Done. Your alarm is set for 6:30 AM\nwith \"Morning Confidence.\"", in: botRect.insetBy(dx: cornerR * 0.8, dy: botH * 0.12), font: botFont, color: Brand.fg, alignment: .left, lineSpacing: 4)

    // Input bar at bottom
    let barH = bubbleH * 0.85
    let barY = botY + botH + size.height * 0.04
    let barRect = CGRect(x: pad, y: barY, width: bubbleW, height: barH)
    drawRoundedRect(ctx, barRect, radius: barH / 2, fill: Brand.panel)
    drawRoundedRectStroke(ctx, barRect, radius: barH / 2, stroke: Brand.border, lineWidth: 1.5)
    let placeholderFont = NSFont.systemFont(ofSize: size.width * 0.024, weight: .regular)
    drawWrappedText(ctx, "Tell Que what you need...", in: barRect.insetBy(dx: barH * 0.5, dy: barH * 0.2), font: placeholderFont, color: Brand.fgFaint, alignment: .left)

    // Mic icon circle
    let micR = barH * 0.35
    let micCenter = CGPoint(x: barRect.maxX - barH * 0.55, y: barRect.midY)
    drawCircle(ctx, center: micCenter, radius: micR, fill: Brand.alarm)
}

/// Slide 3: alarm cards
func drawAlarmSlide(_ ctx: CGContext, _ size: CGSize) {
    let pad = size.width * 0.08
    let cardW = size.width - pad * 2
    let cardH = size.height * 0.075
    let startY = size.height * 0.42
    let gap = size.height * 0.018

    let alarms: [(String, String, String, Bool)] = [
        ("6:30", "AM", "Morning Confidence", true),
        ("7:00", "AM", "Deep Focus & Flow", true),
        ("9:00", "PM", "Sleep Quality", false),
    ]

    for (i, (time, ampm, label, enabled)) in alarms.enumerated() {
        let y = startY + CGFloat(i) * (cardH + gap)
        let rect = CGRect(x: pad, y: y, width: cardW, height: cardH)
        drawRoundedRect(ctx, rect, radius: 18, fill: Brand.panel)
        drawRoundedRectStroke(ctx, rect, radius: 18, stroke: Brand.border, lineWidth: 1)

        let timeFont = NSFont.monospacedDigitSystemFont(ofSize: size.width * 0.055, weight: .light)
        let ampmFont = NSFont.systemFont(ofSize: size.width * 0.022, weight: .medium)
        let labelFont = NSFont.systemFont(ofSize: size.width * 0.022, weight: .regular)
        let textColor = enabled ? Brand.fg : Brand.fgFaint
        let dimColor = enabled ? Brand.fgDim : Brand.fgFaint

        let textY = y + cardH * 0.22
        drawText(ctx, time, at: CGPoint(x: pad + 24, y: textY), font: timeFont, color: textColor)

        // AM/PM next to time
        let timeSize = (time as NSString).size(withAttributes: [.font: timeFont])
        drawText(ctx, ampm, at: CGPoint(x: pad + 24 + timeSize.width + 8, y: textY + timeSize.height - (ampm as NSString).size(withAttributes: [.font: ampmFont]).height), font: ampmFont, color: textColor)

        // Label below
        drawText(ctx, label, at: CGPoint(x: pad + 24, y: y + cardH * 0.62), font: labelFont, color: dimColor)

        // Toggle circle on right
        let toggleR: CGFloat = cardH * 0.16
        let toggleCenter = CGPoint(x: rect.maxX - 36, y: rect.midY)
        drawCircle(ctx, center: toggleCenter, radius: toggleR, fill: enabled ? Brand.success : Brand.fgFaint.withAlphaComponent(0.3))
    }
}

/// Slide 4: category grid
func drawCategorySlide(_ ctx: CGContext, _ size: CGSize) {
    let pad = size.width * 0.08
    let cols = 2
    let gap: CGFloat = size.width * 0.035
    let tileW = (size.width - pad * 2 - gap) / CGFloat(cols)
    let tileH = tileW * 0.65
    let startY = size.height * 0.42

    let categories: [(String, NSColor)] = [
        ("Focus &\nProductivity", Brand.accent),
        ("Health &\nHabits", Brand.success),
        ("Mental &\nEmotional", NSColor(red: 0.4, green: 0.6, blue: 1.0, alpha: 1)),
        ("Spiritual\n& Purpose", Brand.alarm),
    ]

    for (i, (label, tint)) in categories.enumerated() {
        let col = i % cols
        let row = i / cols
        let x = pad + CGFloat(col) * (tileW + gap)
        let y = startY + CGFloat(row) * (tileH + gap)
        let rect = CGRect(x: x, y: y, width: tileW, height: tileH)

        drawRoundedRect(ctx, rect, radius: 20, fill: tint.withAlphaComponent(0.12))
        drawRoundedRectStroke(ctx, rect, radius: 20, stroke: tint.withAlphaComponent(0.3), lineWidth: 1.5)

        let font = NSFont.systemFont(ofSize: size.width * 0.03, weight: .semibold)
        drawWrappedText(ctx, label, in: rect.insetBy(dx: 16, dy: tileH * 0.2), font: font, color: tint, alignment: .left, lineSpacing: 2)
    }
}

/// Slide 5: ambient sound selector
func drawAmbientSlide(_ ctx: CGContext, _ size: CGSize) {
    let pad = size.width * 0.08
    let chipH = size.height * 0.042
    let chipGap: CGFloat = size.height * 0.015
    let startY = size.height * 0.44

    let sounds: [(String, String, Bool)] = [
        ("🌧", "Gentle Rain", true),
        ("🌊", "Ocean Waves", false),
        ("🐦", "Morning Birds", false),
        ("🔔", "Singing Bowl", false),
        ("🧠", "Theta Hum", false),
    ]

    for (i, (icon, label, selected)) in sounds.enumerated() {
        let y = startY + CGFloat(i) * (chipH + chipGap)
        let chipW = size.width - pad * 2
        let rect = CGRect(x: pad, y: y, width: chipW, height: chipH)

        if selected {
            drawRoundedRect(ctx, rect, radius: chipH / 2, fill: Brand.accent.withAlphaComponent(0.15))
            drawRoundedRectStroke(ctx, rect, radius: chipH / 2, stroke: Brand.accent.withAlphaComponent(0.5), lineWidth: 1.5)
        } else {
            drawRoundedRect(ctx, rect, radius: chipH / 2, fill: Brand.panel)
            drawRoundedRectStroke(ctx, rect, radius: chipH / 2, stroke: Brand.border, lineWidth: 1)
        }

        let iconFont = NSFont.systemFont(ofSize: size.width * 0.032)
        let labelFont = NSFont.systemFont(ofSize: size.width * 0.028, weight: selected ? .semibold : .regular)
        let textColor = selected ? Brand.accent : Brand.fg

        drawText(ctx, icon, at: CGPoint(x: pad + chipH * 0.5, y: y + chipH * 0.25), font: iconFont, color: Brand.fg)
        drawText(ctx, label, at: CGPoint(x: pad + chipH * 1.2, y: y + chipH * 0.3), font: labelFont, color: textColor)

        if selected {
            let checkFont = NSFont.systemFont(ofSize: size.width * 0.026, weight: .bold)
            drawText(ctx, "✓", at: CGPoint(x: rect.maxX - chipH * 0.7, y: y + chipH * 0.28), font: checkFont, color: Brand.accent)
        }
    }
}

// MARK: – Screenshot list -------------------------------------------------

let screenshots = [
    Screenshot(
        slug: "01-hero",
        headline: "Wake Up\nWith Purpose",
        subline: "Audio hypnotherapy meets your alarm.\nQue primes your mindset while you're\nstill in theta — the most receptive\nstate of your day.",
        draw: drawOrbSlide
    ),
    Screenshot(
        slug: "02-chat",
        headline: "Just Tell Que\nWhat You Need",
        subline: "Set alarms, pick sessions, and personalize\nyour morning — all through natural\nconversation.",
        draw: drawChatSlide
    ),
    Screenshot(
        slug: "03-alarms",
        headline: "Set It.\nSleep.\nWake Better.",
        subline: "Each alarm pairs with a guided session\nthat meets you in the half-awake window\nwhere real change happens.",
        draw: drawAlarmSlide
    ),
    Screenshot(
        slug: "04-programs",
        headline: "Choose\nYour Focus",
        subline: "Focus. Confidence. Recovery. Calm.\nReal programs for what you're actually\nworking on — not generic affirmations.",
        draw: drawCategorySlide
    ),
    Screenshot(
        slug: "05-ambient",
        headline: "Your Sound.\nYour Space.",
        subline: "Layer gentle rain, ocean waves,\nor theta-frequency hum beneath\nevery session. You choose.",
        draw: drawAmbientSlide
    ),
]

// MARK: – Rendering -------------------------------------------------------

func renderScreenshot(_ shot: Screenshot, device: DeviceSpec, outputDir: String) {
    let w = device.width
    let h = device.height
    let size = CGSize(width: w, height: h)
    let isIPad = device.suffix.contains("ipad")

    let cs = CGColorSpaceCreateDeviceRGB()
    guard let ctx = CGContext(data: nil, width: w, height: h,
                              bitsPerComponent: 8, bytesPerRow: 0, space: cs,
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
    else {
        print("  ✗ Failed to create context for \(device.name)")
        return
    }

    // Core Graphics uses bottom-left origin. Flip to top-left for intuitive drawing.
    ctx.translateBy(x: 0, y: CGFloat(h))
    ctx.scaleBy(x: 1, y: -1)

    // Background gradient
    drawGradient(ctx, CGRect(origin: .zero, size: size), from: Brand.bgDeep, to: Brand.bg)

    // Subtle top accent glow
    let glowH = CGFloat(h) * 0.25
    let glowRect = CGRect(x: 0, y: 0, width: CGFloat(w), height: glowH)
    drawGradient(ctx, glowRect, from: Brand.accent.withAlphaComponent(0.06), to: NSColor.clear)

    // Headline
    let headlineSize: CGFloat = isIPad ? CGFloat(w) * 0.065 : CGFloat(w) * 0.075
    let headlineFont = NSFont.systemFont(ofSize: headlineSize, weight: .bold)
    let headlinePad = CGFloat(w) * 0.08
    let headlineY: CGFloat = CGFloat(h) * 0.06
    let headlineRect = CGRect(x: headlinePad, y: headlineY, width: CGFloat(w) - headlinePad * 2, height: CGFloat(h) * 0.22)
    drawWrappedText(ctx, shot.headline, in: headlineRect, font: headlineFont, color: Brand.fg, alignment: .center, lineSpacing: 4)

    // Subline
    let subSize: CGFloat = isIPad ? CGFloat(w) * 0.024 : CGFloat(w) * 0.028
    let subFont = NSFont.systemFont(ofSize: subSize, weight: .regular)
    let subY: CGFloat = CGFloat(h) * 0.27
    let subRect = CGRect(x: headlinePad, y: subY, width: CGFloat(w) - headlinePad * 2, height: CGFloat(h) * 0.15)
    drawWrappedText(ctx, shot.subline, in: subRect, font: subFont, color: Brand.fgDim, alignment: .center, lineSpacing: 6)

    // Custom art
    shot.draw(ctx, size)

    // Bottom brand mark
    let brandFont = NSFont.systemFont(ofSize: CGFloat(w) * 0.025, weight: .medium)
    let brandY = CGFloat(h) * 0.95
    let brandRect = CGRect(x: 0, y: brandY, width: CGFloat(w), height: CGFloat(h) * 0.04)
    drawWrappedText(ctx, "Que", in: brandRect, font: brandFont, color: Brand.fgFaint, alignment: .center)

    // Export
    guard let image = ctx.makeImage() else {
        print("  ✗ Failed to make image for \(device.name)")
        return
    }
    let bitmap = NSBitmapImageRep(cgImage: image)
    guard let pngData = bitmap.representation(using: .png, properties: [:]) else {
        print("  ✗ Failed to encode PNG for \(device.name)")
        return
    }
    let filename = "\(outputDir)/\(shot.slug)-\(device.suffix).png"
    do {
        try pngData.write(to: URL(fileURLWithPath: filename))
        print("  ✓ \(filename)")
    } catch {
        print("  ✗ Write failed: \(error)")
    }
}

// MARK: – Main ------------------------------------------------------------

let repoRoot = FileManager.default.currentDirectoryPath
let outputDir = repoRoot + "/assets/screenshots"

// Ensure output directory exists
try? FileManager.default.createDirectory(atPath: outputDir, withIntermediateDirectories: true)

print("Generating Que App Store screenshots...\n")

for shot in screenshots {
    print("[\(shot.slug)]")
    for device in devices {
        renderScreenshot(shot, device: device, outputDir: outputDir)
    }
    print("")
}

print("Done. \(screenshots.count * devices.count) screenshots written to assets/screenshots/")
