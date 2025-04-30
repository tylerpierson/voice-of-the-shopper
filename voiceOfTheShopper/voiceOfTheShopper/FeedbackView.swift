//
//  FeedbackView.swift
//  voiceOfTheShopper
//
//  Created by Tyler Pierson on 4/28/25.
//

import SwiftUI

struct FeedbackView: View {
    @State private var feedbackText = ""
    @State private var message = ""
    
    var body: some View {
        NavigationView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Submit Your Feedback")
                    .font(.title)
                
                TextEditor(text: $feedbackText)
                    .frame(height: 150)
                    .border(Color.gray, width: 1)
                    .padding(.bottom, 10)
                
                Button(action: {
                    submitFeedback()
                }) {
                    Text("Submit Feedback")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }
                
                if !message.isEmpty {
                    Text(message)
                        .foregroundColor(.green)
                        .padding(.top, 10)
                }
                
                Spacer()
            }
            .padding()
            .navigationTitle("Feedback Assistant")
        }
    }
    
    func submitFeedback() {
        guard let url = URL(string: "http://localhost:8000/submit-feedback") else {
            self.message = "Invalid server URL"
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: String] = ["message": feedbackText]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])
        } catch {
            self.message = "Failed to encode feedback"
            return
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    self.message = "Error: \(error.localizedDescription)"
                } else {
                    self.message = "Thank you for your feedback!"
                    self.feedbackText = ""
                }
            }
        }.resume()
    }
}

struct FeedbackView_Previews: PreviewProvider {
    static var previews: some View {
        FeedbackView()
    }
}
