//
//  AdminDashboardView.swift
//  voiceOfTheShopper
//
//  Created by Tyler Pierson on 4/28/25.
//

import SwiftUI

struct SummaryItem: Identifiable, Codable {
    var id: String { session_id }
    let session_id: String
    let summary: String
    let department: String
    let sentiment: String
}

struct AdminDashboardView: View {
    @State private var summaries: [SummaryItem] = []

    var body: some View {
        NavigationView {
            VStack {
                List {
                    ForEach(summaries) { summary in
                        VStack(alignment: .leading) {
                            HStack {
                                Text("Department: \(summary.department)")
                                    .font(.subheadline)
                                    .foregroundColor(.gray)
                                Spacer()
                                Button(role: .destructive) {
                                    deleteSummary(sessionID: summary.session_id)
                                } label: {
                                    Image(systemName: "trash")
                                }
                            }
                            Text("Sentiment: \(summary.sentiment)")
                                .font(.subheadline)
                                .foregroundColor(sentimentColor(for: summary.sentiment))
                            Text(summary.summary)
                                .font(.body)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .navigationTitle("Admin Dashboard")
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    fetchSummaries()
                }
            }
        }
    }

    func fetchSummaries() {
        guard let url = URL(string: "http://localhost:8000/get-summaries") else { return }

        URLSession.shared.dataTask(with: url) { data, response, error in
            guard let data = data else { return }
            do {
                let fetchedSummaries = try JSONDecoder().decode([SummaryItem].self, from: data)
                DispatchQueue.main.async {
                    self.summaries = fetchedSummaries
                }
            } catch {
                print("Error decoding summaries: \(error)")
            }
        }.resume()
    }

    func deleteSummary(sessionID: String) {
        guard let url = URL(string: "http://localhost:8000/delete-summary/\(sessionID)") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"

        URLSession.shared.dataTask(with: request) { _, response, error in
            DispatchQueue.main.async {
                summaries.removeAll { $0.session_id == sessionID }
                fetchSummaries()
            }
        }.resume()
    }

    func sentimentColor(for sentiment: String) -> Color {
        switch sentiment.uppercased() {
        case "POSITIVE": return .green
        case "NEGATIVE": return .red
        case "NEUTRAL": return .gray
        default: return .orange
        }
    }
}

struct AdminDashboardView_Previews: PreviewProvider {
    static var previews: some View {
        AdminDashboardView()
    }
}
