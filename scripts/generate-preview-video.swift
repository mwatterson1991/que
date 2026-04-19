#!/usr/bin/env swift
//
// generate-preview-video.swift
//
// Generates an App Store preview video (15–30 sec, H.264) for Que.
// Uses Core Graphics for frame rendering and AVFoundation for video encoding.
//
// Usage:  swift scripts/generate-preview-video.swift
// Output: assets/appstore/preview-video-6.7in.mp4

import AppKit
import AVFoundation
import CoreGraphics
import Foundation
import UniformTypeIdentifiers

// MARK: - Configuration

let videoWidth = 1290
let videoHeight = 2796
let fps: Int32 = 30
let slideDuration: Double = 3.5     // seconds per slide
let transitionDuration: Double = 0.6 // cross-fade between slides

// Brand colors
let bgColor = CGColor(red: 0.067, green: 0.067, blue: 0.102, alpha: 1.0)       // #111119
let accentColor = CGColor(red: 0.486, green: 0.306, blue: 0.914, alpha: 1.0)   // #7C4EE9
let textColor = CGColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 1.0)
let subtextColor = CGColor(red: 0.7, green: 0.7, blue: 0.76, alpha: 1.0)
let cardColor = CGColor(red: 0.11, green: 0.11, blue: 0.16, alpha: 1.0)

// Output path
let repoRoot = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let outputURL = repoRoot.appendingPathComponent("assets/appstore/preview-video-6.7in.mp4")

// MARK: - Slide definitions

struct Slide {
    let headline: String
    let subline: String
    let mockupType: MockupType
}

enum MockupType {
    case hero
    case alarmRing
    case programs
    case ambientSound
    case cta
}

let slides: [Slide] = [
    Slide(
        headline: "Your alarm does\nmore than wake you.",
        subline: "It primes your mind for the day.",
        mockupType: .hero
    ),
    Slide(
        headline: "Wake into a guided\ntheta session.",
        subline: "Personalized audio meets you\nin your most receptive state.",
        mockupType: .alarmRing
    ),
    Slide(
        headline: "Programs for focus,\nconfidence, and calm.",
        subline: "From beating procrastination\nto reducing anxiety.",
        mockupType: .programs
    ),
    Slide(
        headline: "Layer ambient sound\nover every session.",
        subline: "Rain, ocean waves, birdsong,\nor binaural theta hum.",
        mockupType: .ambientSound
    ),
    Slide(
        headline: "Que.",
        subline: "Wake up with purpose.",
        mockupType: .cta
    ),
]

// MARK: - Drawing helpers

func drawRoundedRect(ctx: CGContext, rect: CGRect, radius: CGFloat, fill: CGColor) {
    let path = CGMutablePath()
    path.addRoundedRect(in: rect, cornerWidth: radius, cornerHeight: radius)
    ctx.addPath(path)
    ctx.setFillColor(fill)
    ctx.fillPath()
}

func drawText(_ text: String, in ctx: CGContext, x: CGFloat, y: CGFloat,
              fontSize: CGFloat, color: CGColor, bold: Bool = false,
              maxWidth: CGFloat = CGFloat(videoWidth) - 140) {
    let font = bold
        ? CTFontCreateWithName("HelveticaNeue-Bold" as CFString, fontSize, nil)
        : CTFontCreateWithName("HelveticaNeue" as CFString, fontSize, nil)

    let paragraphStyle = NSMutableParagraphStyle()
    paragraphStyle.alignment = .left
    paragraphStyle.lineSpacing = fontSize * 0.15

    let attributes: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: NSColor(cgColor: color) ?? NSColor.white,
        .paragraphStyle: paragraphStyle,
    ]

    let attrString = NSAttributedString(string: text, attributes: attributes)
    let framesetter = CTFramesetterCreateWithAttributedString(attrString)
    let framePath = CGPath(rect: CGRect(x: x, y: y, width: maxWidth, height: fontSize * 6), transform: nil)
    let frame = CTFramesetterCreateFrame(framesetter, CFRange(location: 0, length: 0), framePath, nil)
    CTFrameDraw(frame, ctx)
}

func drawCenteredText(_ text: String, in ctx: CGContext, centerX: CGFloat, y: CGFloat,
                      fontSize: CGFloat, color: CGColor, bold: Bool = false) {
    let font = bold
        ? CTFontCreateWithName("HelveticaNeue-Bold" as CFString, fontSize, nil)
        : CTFontCreateWithName("HelveticaNeue" as CFString, fontSize, nil)

    let paragraphStyle = NSMutableParagraphStyle()
    paragraphStyle.alignment = .center
    paragraphStyle.lineSpacing = fontSize * 0.15

    let attributes: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: NSColor(cgColor: color) ?? NSColor.white,
        .paragraphStyle: paragraphStyle,
    ]

    let attrString = NSAttributedString(string: text, attributes: attributes)
    let framesetter = CTFramesetterCreateWithAttributedString(attrString)
    let maxWidth: CGFloat = CGFloat(videoWidth) - 140
    let framePath = CGPath(rect: CGRect(x: centerX - maxWidth / 2, y: y, width: maxWidth, height: fontSize * 6), transform: nil)
    let frame = CTFramesetterCreateFrame(framesetter, CFRange(location: 0, length: 0), framePath, nil)
    CTFrameDraw(frame, ctx)
}

// MARK: - Mockup drawing

func drawMockPhone(ctx: CGContext, yOffset: CGFloat, contentDraw: (CGContext, CGRect) -> Void) {
    let phoneW: CGFloat = 680
    let phoneH: CGFloat = 1380
    let phoneX: CGFloat = (CGFloat(videoWidth) - phoneW) / 2
    let phoneY: CGFloat = yOffset

    // Phone bezel
    let bezelColor = CGColor(red: 0.18, green: 0.18, blue: 0.24, alpha: 1.0)
    drawRoundedRect(ctx: ctx, rect: CGRect(x: phoneX - 12, y: phoneY - 12, width: phoneW + 24, height: phoneH + 24),
                    radius: 48, fill: bezelColor)

    // Phone screen
    let screenRect = CGRect(x: phoneX, y: phoneY, width: phoneW, height: phoneH)
    drawRoundedRect(ctx: ctx, rect: screenRect, radius: 36, fill: bgColor)

    ctx.saveGState()
    let clipPath = CGMutablePath()
    clipPath.addRoundedRect(in: screenRect, cornerWidth: 36, cornerHeight: 36)
    ctx.addPath(clipPath)
    ctx.clip()
    contentDraw(ctx, screenRect)
    ctx.restoreGState()
}

func drawHeroScreen(ctx: CGContext, rect: CGRect) {
    // Status bar area
    drawText("9:41", in: ctx, x: rect.minX + 30, y: rect.maxY - 70, fontSize: 28, color: textColor, bold: true)

    // Time display
    drawCenteredText("6:30 AM", in: ctx, centerX: rect.midX, y: rect.maxY - 280, fontSize: 96, color: textColor, bold: true)
    drawCenteredText("Good morning, Michael", in: ctx, centerX: rect.midX, y: rect.maxY - 340, fontSize: 32, color: subtextColor)

    // Session card
    let cardW: CGFloat = rect.width - 60
    let cardH: CGFloat = 200.0
    let cardX = rect.minX + 30
    let cardY = rect.maxY - 620
    drawRoundedRect(ctx: ctx, rect: CGRect(x: cardX, y: cardY, width: cardW, height: cardH), radius: 20, fill: cardColor)

    // Play button circle
    let playX = cardX + 30
    let playY = cardY + cardH / 2 - 30
    let playSize: CGFloat = 60
    drawRoundedRect(ctx: ctx, rect: CGRect(x: playX, y: playY, width: playSize, height: playSize), radius: playSize / 2, fill: accentColor)

    // Triangle play icon
    ctx.setFillColor(textColor)
    ctx.move(to: CGPoint(x: playX + 22, y: playY + 15))
    ctx.addLine(to: CGPoint(x: playX + 22, y: playY + 45))
    ctx.addLine(to: CGPoint(x: playX + 44, y: playY + 30))
    ctx.closePath()
    ctx.fillPath()

    drawText("General Morning Mindset", in: ctx, x: cardX + 110, y: cardY + cardH - 60, fontSize: 28, color: textColor, bold: true)
    drawText("12 min · Theta session", in: ctx, x: cardX + 110, y: cardY + cardH - 100, fontSize: 22, color: subtextColor)

    // Nav bar at bottom
    let navY = rect.minY
    let navH: CGFloat = 100
    ctx.setFillColor(cardColor)
    ctx.fill(CGRect(x: rect.minX, y: navY, width: rect.width, height: navH))
}

func drawAlarmRingScreen(ctx: CGContext, rect: CGRect) {
    // Pulsing circles behind the time
    let centerX = rect.midX
    let centerY = rect.midY + 200

    for i in stride(from: 3, through: 0, by: -1) {
        let radius: CGFloat = 120 + CGFloat(i) * 60
        let alpha: CGFloat = 0.08 - CGFloat(i) * 0.015
        let circleColor = CGColor(red: 0.486, green: 0.306, blue: 0.914, alpha: alpha)
        ctx.setFillColor(circleColor)
        ctx.fillEllipse(in: CGRect(x: centerX - radius, y: centerY - radius, width: radius * 2, height: radius * 2))
    }

    // Core circle
    drawRoundedRect(ctx: ctx, rect: CGRect(x: centerX - 110, y: centerY - 110, width: 220, height: 220),
                    radius: 110, fill: accentColor)

    // Pause icon
    ctx.setFillColor(textColor)
    ctx.fill(CGRect(x: centerX - 30, y: centerY - 35, width: 20, height: 70))
    ctx.fill(CGRect(x: centerX + 10, y: centerY - 35, width: 20, height: 70))

    drawCenteredText("6:30 AM", in: ctx, centerX: centerX, y: centerY + 200, fontSize: 72, color: textColor, bold: true)
    drawCenteredText("Your session is starting...", in: ctx, centerX: centerX, y: centerY + 140, fontSize: 30, color: subtextColor)

    // Waveform visualization
    let waveY: CGFloat = rect.minY + 300
    ctx.setFillColor(accentColor)
    for i in 0..<40 {
        let barX = rect.minX + 40 + CGFloat(i) * 16
        let barH = CGFloat(20 + Int.random(in: 10...80))
        ctx.fill(CGRect(x: barX, y: waveY - barH / 2, width: 8, height: barH))
    }
}

func drawProgramsScreen(ctx: CGContext, rect: CGRect) {
    drawText("9:41", in: ctx, x: rect.minX + 30, y: rect.maxY - 70, fontSize: 28, color: textColor, bold: true)
    drawText("Programs", in: ctx, x: rect.minX + 30, y: rect.maxY - 150, fontSize: 48, color: textColor, bold: true)

    let categories = [
        ("Focus & Productivity", ["Deep Focus & Flow State", "Beat Procrastination", "Stop Wasting Time"]),
        ("Mental & Emotional", ["Reduce Anxiety", "Build Confidence", "Improve Sleep Quality"]),
        ("Health & Habits", ["Quit Vaping / Nicotine", "Build Exercise Habit"]),
    ]

    var yPos = rect.maxY - 240

    for (category, items) in categories {
        drawText(category, in: ctx, x: rect.minX + 30, y: yPos, fontSize: 26, color: accentColor, bold: true)
        yPos -= 50

        for item in items {
            let cardRect = CGRect(x: rect.minX + 30, y: yPos - 60, width: rect.width - 60, height: 70)
            drawRoundedRect(ctx: ctx, rect: cardRect, radius: 14, fill: cardColor)
            drawText(item, in: ctx, x: rect.minX + 55, y: yPos - 30, fontSize: 24, color: textColor)

            // Chevron
            ctx.setStrokeColor(subtextColor)
            ctx.setLineWidth(3)
            let chevX = rect.maxX - 60
            let chevY = yPos - 30
            ctx.move(to: CGPoint(x: chevX, y: chevY - 10))
            ctx.addLine(to: CGPoint(x: chevX + 10, y: chevY))
            ctx.addLine(to: CGPoint(x: chevX, y: chevY + 10))
            ctx.strokePath()

            yPos -= 85
        }
        yPos -= 20
    }
}

func drawAmbientSoundScreen(ctx: CGContext, rect: CGRect) {
    drawText("9:41", in: ctx, x: rect.minX + 30, y: rect.maxY - 70, fontSize: 28, color: textColor, bold: true)
    drawText("Ambient Sound", in: ctx, x: rect.minX + 30, y: rect.maxY - 150, fontSize: 48, color: textColor, bold: true)
    drawText("Plays underneath every session", in: ctx, x: rect.minX + 30, y: rect.maxY - 200, fontSize: 24, color: subtextColor)

    let sounds = [
        ("Gentle Rain", true),
        ("Soft Ocean Waves", false),
        ("Morning Birds", false),
        ("Tibetan Singing Bowl", false),
        ("Theta Binaural Hum", false),
        ("Silence", false),
    ]

    var yPos = rect.maxY - 300

    for (name, selected) in sounds {
        let cardRect = CGRect(x: rect.minX + 30, y: yPos - 80, width: rect.width - 60, height: 90)
        let cardFill = selected ? accentColor : cardColor
        drawRoundedRect(ctx: ctx, rect: cardRect, radius: 16, fill: cardFill)

        // Sound icon (circle)
        let iconX = rect.minX + 55
        let iconY = yPos - 50
        let iconColor = selected ? textColor : subtextColor
        ctx.setFillColor(iconColor)
        ctx.fillEllipse(in: CGRect(x: iconX, y: iconY - 12, width: 24, height: 24))

        drawText(name, in: ctx, x: rect.minX + 100, y: yPos - 42, fontSize: 28, color: textColor, bold: selected)

        if selected {
            // Checkmark
            ctx.setStrokeColor(textColor)
            ctx.setLineWidth(4)
            let chkX = rect.maxX - 75
            let chkY = yPos - 42
            ctx.move(to: CGPoint(x: chkX, y: chkY))
            ctx.addLine(to: CGPoint(x: chkX + 8, y: chkY + 10))
            ctx.addLine(to: CGPoint(x: chkX + 24, y: chkY - 8))
            ctx.strokePath()
        }

        yPos -= 110
    }

    // Volume slider
    let sliderY = yPos - 40
    drawText("Volume", in: ctx, x: rect.minX + 30, y: sliderY + 10, fontSize: 22, color: subtextColor)
    let sliderTrack = CGRect(x: rect.minX + 140, y: sliderY, width: rect.width - 200, height: 6)
    drawRoundedRect(ctx: ctx, rect: sliderTrack, radius: 3,
                    fill: CGColor(red: 0.3, green: 0.3, blue: 0.36, alpha: 1.0))
    let filledWidth = (rect.width - 200) * 0.3
    drawRoundedRect(ctx: ctx, rect: CGRect(x: rect.minX + 140, y: sliderY, width: filledWidth, height: 6),
                    radius: 3, fill: accentColor)
    // Knob
    ctx.setFillColor(textColor)
    ctx.fillEllipse(in: CGRect(x: rect.minX + 140 + filledWidth - 10, y: sliderY - 7, width: 20, height: 20))
}

func drawCtaScreen(ctx: CGContext, rect: CGRect) {
    let centerX = rect.midX
    let centerY = rect.midY

    // Large Q letterform
    let qSize: CGFloat = 280
    let qRect = CGRect(x: centerX - qSize / 2, y: centerY + 40, width: qSize, height: qSize)

    // Outer ring
    ctx.setStrokeColor(accentColor)
    ctx.setLineWidth(24)
    ctx.strokeEllipse(in: qRect.insetBy(dx: 12, dy: 12))

    // Q tail
    ctx.setFillColor(accentColor)
    let tailPath = CGMutablePath()
    tailPath.move(to: CGPoint(x: centerX + 50, y: centerY + 40 + 20))
    tailPath.addLine(to: CGPoint(x: centerX + 130, y: centerY + 40 - 60))
    tailPath.addLine(to: CGPoint(x: centerX + 110, y: centerY + 40 - 70))
    tailPath.addLine(to: CGPoint(x: centerX + 30, y: centerY + 40 + 10))
    tailPath.closeSubpath()
    ctx.addPath(tailPath)
    ctx.fillPath()

    drawCenteredText("Que", in: ctx, centerX: centerX, y: centerY - 60, fontSize: 64, color: textColor, bold: true)
    drawCenteredText("Wake up with purpose.", in: ctx, centerX: centerX, y: centerY - 120, fontSize: 34, color: subtextColor)

    // Download CTA
    let ctaW: CGFloat = 400
    let ctaH: CGFloat = 80
    let ctaX = centerX - ctaW / 2
    let ctaY = centerY - 300
    drawRoundedRect(ctx: ctx, rect: CGRect(x: ctaX, y: ctaY, width: ctaW, height: ctaH), radius: ctaH / 2, fill: accentColor)
    drawCenteredText("Download Free", in: ctx, centerX: centerX, y: ctaY + 22, fontSize: 30, color: textColor, bold: true)
}

// MARK: - Render a single slide frame

func renderSlide(_ slide: Slide, ctx: CGContext, w: Int, h: Int) {
    // Background
    ctx.setFillColor(bgColor)
    ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))

    let flippedH = CGFloat(h)

    switch slide.mockupType {
    case .hero:
        // Headline at top
        drawText(slide.headline, in: ctx, x: 70, y: flippedH - 240, fontSize: 62, color: textColor, bold: true)
        drawText(slide.subline, in: ctx, x: 70, y: flippedH - 420, fontSize: 30, color: subtextColor)
        drawMockPhone(ctx: ctx, yOffset: 100) { ctx, rect in
            drawHeroScreen(ctx: ctx, rect: rect)
        }

    case .alarmRing:
        drawText(slide.headline, in: ctx, x: 70, y: flippedH - 240, fontSize: 62, color: textColor, bold: true)
        drawText(slide.subline, in: ctx, x: 70, y: flippedH - 460, fontSize: 30, color: subtextColor)
        drawMockPhone(ctx: ctx, yOffset: 100) { ctx, rect in
            drawAlarmRingScreen(ctx: ctx, rect: rect)
        }

    case .programs:
        drawText(slide.headline, in: ctx, x: 70, y: flippedH - 240, fontSize: 62, color: textColor, bold: true)
        drawText(slide.subline, in: ctx, x: 70, y: flippedH - 420, fontSize: 30, color: subtextColor)
        drawMockPhone(ctx: ctx, yOffset: 100) { ctx, rect in
            drawProgramsScreen(ctx: ctx, rect: rect)
        }

    case .ambientSound:
        drawText(slide.headline, in: ctx, x: 70, y: flippedH - 240, fontSize: 62, color: textColor, bold: true)
        drawText(slide.subline, in: ctx, x: 70, y: flippedH - 420, fontSize: 30, color: subtextColor)
        drawMockPhone(ctx: ctx, yOffset: 100) { ctx, rect in
            drawAmbientSoundScreen(ctx: ctx, rect: rect)
        }

    case .cta:
        drawCtaScreen(ctx: ctx, rect: CGRect(x: 0, y: 0, width: CGFloat(w), height: CGFloat(h)))
    }
}

// MARK: - Create a CGImage for a slide

func createSlideImage(_ slide: Slide) -> CGImage {
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let ctx = CGContext(
        data: nil, width: videoWidth, height: videoHeight,
        bitsPerComponent: 8, bytesPerRow: videoWidth * 4,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
    )!
    renderSlide(slide, ctx: ctx, w: videoWidth, h: videoHeight)
    return ctx.makeImage()!
}

// MARK: - Blend two images with alpha

func blendImages(_ imgA: CGImage, _ imgB: CGImage, alpha: CGFloat) -> CVPixelBuffer {
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let ctx = CGContext(
        data: nil, width: videoWidth, height: videoHeight,
        bitsPerComponent: 8, bytesPerRow: videoWidth * 4,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
    )!
    let fullRect = CGRect(x: 0, y: 0, width: videoWidth, height: videoHeight)

    ctx.setAlpha(1.0)
    ctx.draw(imgA, in: fullRect)
    ctx.setAlpha(alpha)
    ctx.draw(imgB, in: fullRect)

    let image = ctx.makeImage()!

    var pixelBuffer: CVPixelBuffer?
    let attrs: [String: Any] = [
        kCVPixelBufferCGImageCompatibilityKey as String: true,
        kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
    ]
    CVPixelBufferCreate(kCFAllocatorDefault, videoWidth, videoHeight,
                        kCVPixelFormatType_32ARGB, attrs as CFDictionary, &pixelBuffer)

    let pb = pixelBuffer!
    CVPixelBufferLockBaseAddress(pb, [])
    let pbCtx = CGContext(
        data: CVPixelBufferGetBaseAddress(pb),
        width: videoWidth, height: videoHeight,
        bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pb),
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
    )!
    pbCtx.draw(image, in: fullRect)
    CVPixelBufferUnlockBaseAddress(pb, [])

    return pb
}

func imageToPixelBuffer(_ image: CGImage) -> CVPixelBuffer {
    var pixelBuffer: CVPixelBuffer?
    let attrs: [String: Any] = [
        kCVPixelBufferCGImageCompatibilityKey as String: true,
        kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
    ]
    CVPixelBufferCreate(kCFAllocatorDefault, videoWidth, videoHeight,
                        kCVPixelFormatType_32ARGB, attrs as CFDictionary, &pixelBuffer)

    let pb = pixelBuffer!
    CVPixelBufferLockBaseAddress(pb, [])
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let ctx = CGContext(
        data: CVPixelBufferGetBaseAddress(pb),
        width: videoWidth, height: videoHeight,
        bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pb),
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
    )!
    ctx.draw(image, in: CGRect(x: 0, y: 0, width: videoWidth, height: videoHeight))
    CVPixelBufferUnlockBaseAddress(pb, [])

    return pb
}

// MARK: - Video composition

func generateVideo() {
    // Remove existing file
    try? FileManager.default.removeItem(at: outputURL)

    // Pre-render all slide images
    print("Rendering \(slides.count) slide frames...")
    let slideImages = slides.map { createSlideImage($0) }

    // Set up AVAssetWriter
    let writer = try! AVAssetWriter(outputURL: outputURL, fileType: .mp4)

    let videoSettings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: videoWidth,
        AVVideoHeightKey: videoHeight,
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: 12_000_000,
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        ],
    ]

    let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
    writerInput.expectsMediaDataInRealTime = false

    let sourcePixelBufferAttributes: [String: Any] = [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
        kCVPixelBufferWidthKey as String: videoWidth,
        kCVPixelBufferHeightKey as String: videoHeight,
    ]

    let adaptor = AVAssetWriterInputPixelBufferAdaptor(
        assetWriterInput: writerInput,
        sourcePixelBufferAttributes: sourcePixelBufferAttributes
    )

    writer.add(writerInput)
    writer.startWriting()
    writer.startSession(atSourceTime: .zero)

    var frameIndex: Int64 = 0
    let totalSlides = slides.count

    for slideIdx in 0..<totalSlides {
        let holdFrames = Int(slideDuration * Double(fps))
        let transFrames = slideIdx < totalSlides - 1 ? Int(transitionDuration * Double(fps)) : 0

        print("  Slide \(slideIdx + 1)/\(totalSlides): \(holdFrames) hold + \(transFrames) transition frames")

        // Hold frames (static slide)
        for _ in 0..<holdFrames {
            while !writerInput.isReadyForMoreMediaData {
                Thread.sleep(forTimeInterval: 0.01)
            }
            let pb = imageToPixelBuffer(slideImages[slideIdx])
            let time = CMTime(value: frameIndex, timescale: fps)
            adaptor.append(pb, withPresentationTime: time)
            frameIndex += 1
        }

        // Transition frames (cross-fade to next slide)
        if slideIdx < totalSlides - 1 {
            for t in 0..<transFrames {
                while !writerInput.isReadyForMoreMediaData {
                    Thread.sleep(forTimeInterval: 0.01)
                }
                let alpha = CGFloat(t + 1) / CGFloat(transFrames)
                let pb = blendImages(slideImages[slideIdx], slideImages[slideIdx + 1], alpha: alpha)
                let time = CMTime(value: frameIndex, timescale: fps)
                adaptor.append(pb, withPresentationTime: time)
                frameIndex += 1
            }
        }
    }

    writerInput.markAsFinished()

    let semaphore = DispatchSemaphore(value: 0)
    writer.finishWriting {
        semaphore.signal()
    }
    semaphore.wait()

    let totalSeconds = Double(frameIndex) / Double(fps)
    print("Video written to: \(outputURL.path)")
    print("Duration: \(String(format: "%.1f", totalSeconds))s, \(frameIndex) frames at \(fps) fps")
    print("Resolution: \(videoWidth)×\(videoHeight)")
}

// MARK: - Main

generateVideo()
