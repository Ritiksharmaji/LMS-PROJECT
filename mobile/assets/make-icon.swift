import AppKit
import CoreText

// Renders the Orbitly app icon (navy "o." in Sora Bold on coral, like the web favicon).
// usage: swift icon.swift <Sora-Bold.ttf> <out.png> <square|round>
let args = CommandLine.arguments
CTFontManagerRegisterFontsForURL(URL(fileURLWithPath: args[1]) as CFURL, .process, nil)
let size: CGFloat = 1024
let round = args[3] == "round"
let img = NSImage(size: NSSize(width: size, height: size))
img.lockFocus()
let coral = NSColor(srgbRed: 1, green: 0x6B/255.0, blue: 0x57/255.0, alpha: 1)
let navy = NSColor(srgbRed: 0x0E/255.0, green: 0x10/255.0, blue: 0x24/255.0, alpha: 1)
coral.setFill()
(round ? NSBezierPath(ovalIn: NSRect(x: 0, y: 0, width: size, height: size)) : NSBezierPath(rect: NSRect(x: 0, y: 0, width: size, height: size))).fill()
// Faint orbit ring behind the letter.
NSColor(white: 1, alpha: 0.22).setStroke()
let ring = NSBezierPath(ovalIn: NSRect(x: size * 0.16, y: size * 0.16, width: size * 0.68, height: size * 0.68))
ring.lineWidth = size * 0.018
ring.stroke()
let font = NSFont(name: "Sora-Bold", size: size * 0.5)!
let text = NSAttributedString(string: "o.", attributes: [.font: font, .foregroundColor: navy, .kern: -size * 0.02])
let b = text.size()
text.draw(at: NSPoint(x: (size - b.width) / 2 + size * 0.02, y: (size - b.height) / 2 + size * 0.03))
img.unlockFocus()
let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
// iOS icons must be opaque: flatten to RGB without alpha for the square variant.
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[2]))
