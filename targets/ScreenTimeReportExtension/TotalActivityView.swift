import SwiftUI

struct TotalActivityView: View {
    let activityData: ActivityData
    
    var body: some View {
        VStack(spacing: 4) {
            Text(activityData.formattedDuration)
                .font(.system(size: 24, weight: .bold))
            Text("\(activityData.totalPickups) pickups")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(8)
    }
}

#Preview {
    TotalActivityView(activityData: ActivityData(
        totalDuration: 5580,
        totalPickups: 42,
        apps: []
    ))
}
