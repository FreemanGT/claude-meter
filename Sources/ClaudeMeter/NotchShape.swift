// Adapted from DynamicNotchKit by Kai Azim (MIT License).
// https://github.com/MrKai77/DynamicNotchKit
import SwiftUI

struct NotchShape: Shape {
    var topCornerRadius: CGFloat
    var bottomCornerRadius: CGFloat

    var animatableData: AnimatablePair<CGFloat, CGFloat> {
        get { AnimatablePair(topCornerRadius, bottomCornerRadius) }
        set {
            topCornerRadius = newValue.first
            bottomCornerRadius = newValue.second
        }
    }

    func path(in rect: CGRect) -> Path {
        Path { path in
            path.move(to: CGPoint(x: rect.minX, y: rect.minY))
            path.addQuadCurve(
                to: CGPoint(x: rect.minX + topCornerRadius, y: rect.minY + topCornerRadius),
                control: CGPoint(x: rect.minX + topCornerRadius, y: rect.minY)
            )
            path.addLine(to: CGPoint(x: rect.minX + topCornerRadius, y: rect.maxY - bottomCornerRadius))
            path.addQuadCurve(
                to: CGPoint(x: rect.minX + topCornerRadius + bottomCornerRadius, y: rect.maxY),
                control: CGPoint(x: rect.minX + topCornerRadius, y: rect.maxY)
            )
            path.addLine(to: CGPoint(x: rect.maxX - topCornerRadius - bottomCornerRadius, y: rect.maxY))
            path.addQuadCurve(
                to: CGPoint(x: rect.maxX - topCornerRadius, y: rect.maxY - bottomCornerRadius),
                control: CGPoint(x: rect.maxX - topCornerRadius, y: rect.maxY)
            )
            path.addLine(to: CGPoint(x: rect.maxX - topCornerRadius, y: rect.minY + topCornerRadius))
            path.addQuadCurve(
                to: CGPoint(x: rect.maxX, y: rect.minY),
                control: CGPoint(x: rect.maxX - topCornerRadius, y: rect.minY)
            )
            path.closeSubpath()
        }
    }
}
