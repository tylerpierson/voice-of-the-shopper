//
//  FeedbackChatView.swift
//  voiceOfTheShopper
//
//  Created by Tyler Pierson on 4/28/25.
//

import SwiftUI

struct ChatMessage: Identifiable {
    let id = UUID()
    let sender: String // "assistant" or "user"
    let text: String
}

struct FeedbackChatView: View {
    @Binding var showChatbot: Bool
    @State private var isAssistantTyping = false
    @State private var typingDots = ""
    @State private var messages: [ChatMessage] = [
        ChatMessage(sender: "assistant", text: "👋 Hi there! Please select a category and tell me about your experience.")
    ]
    @State private var userInput = ""
    @State private var sessionID: String?
    @State private var selectedCategory: String? = nil
    @State private var showToast = false

    let categories: [(emoji: String, title: String)] = [
        ("😋", "Taste"),
        ("📦", "Packaging"),
        ("💲", "Price"),
        ("🏪", "Availability"),
        ("🛒", "Store Experience"),
        ("🏷️", "Promotions"),
        ("🌱", "Sustainability"),
        ("👨‍👩‍👧‍👦", "Family-Friendliness")
    ]

    let gridLayout = [GridItem(.adaptive(minimum: 120), spacing: 10)]

    var body: some View {
        ZStack {
            VStack {
                // Header
                HStack {
                    Text("Feedback Assistant")
                        .font(.headline)
                    Spacer()
                    Button(action: {
                        if let sessionID = sessionID {
                            finalizeSummary(sessionID: sessionID)
                        }
                        withAnimation {
                            showChatbot = false
                        }
                    }) {
                        Image(systemName: "minus.circle.fill")
                            .font(.title2)
                            .foregroundColor(.gray)
                    }
                }
                .padding()
                .background(Color(.systemGray6))

                Divider()

                // Category Selection Grid
                if selectedCategory == nil {
                    ScrollView {
                        LazyVGrid(columns: gridLayout, spacing: 10) {
                            ForEach(categories, id: \.title) { category in
                                Button(action: {
                                    withAnimation {
                                        selectedCategory = category.title
                                        userInput = "I'd like to give feedback about \(category.title.lowercased())."
                                        sendMessage()
                                    }
                                }) {
                                    ZStack {
                                        Text(category.title)
                                            .frame(maxWidth: .infinity)
                                            .font(.caption2)

                                        HStack {
                                            Text(category.emoji)
                                                .font(.caption)
                                            Spacer()
                                        }
                                        .padding(.horizontal, 6)
                                    }
                                    .frame(height: 36)
                                    .background(Color.blue.opacity(0.15))
                                    .foregroundColor(.blue)
                                    .cornerRadius(8)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                    .transition(.opacity)
                }

                // Chat ScrollView
                ScrollViewReader { proxy in
                    ScrollView {
                        VStack(alignment: .leading, spacing: 12) {
                            ForEach(messages) { message in
                                HStack {
                                    if message.sender == "assistant" {
                                        Text(message.text)
                                            .padding()
                                            .background(Color.blue.opacity(0.2))
                                            .cornerRadius(12)
                                            .frame(maxWidth: 300, alignment: .leading)
                                            .padding(.leading)
                                        Spacer()
                                    } else {
                                        Spacer()
                                        Text(message.text)
                                            .padding()
                                            .background(Color.green.opacity(0.2))
                                            .cornerRadius(12)
                                            .frame(maxWidth: 300, alignment: .trailing)
                                            .padding(.trailing)
                                    }
                                }
                            }

                            if isAssistantTyping {
                                HStack {
                                    Text("Assistant is typing\(typingDots)")
                                        .italic()
                                        .foregroundColor(.gray)
                                        .padding(.leading)
                                    Spacer()
                                }
                            }
                        }
                        .padding(.top)
                    }
                    .onChange(of: messages.count) { _ in
                        if let lastMessage = messages.last {
                            proxy.scrollTo(lastMessage.id, anchor: .bottom)
                        }
                    }
                }

                // Text Input
                HStack {
                    TextField("Type your feedback...", text: $userInput)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .frame(minHeight: 30)
                        .disabled(selectedCategory == nil)

                    Button(action: {
                        sendMessage()
                    }) {
                        Image(systemName: "paperplane.fill")
                            .foregroundColor(.blue)
                            .padding()
                    }
                    .disabled(selectedCategory == nil)
                }
                .padding()
            }
            .frame(width: 350, height: 600)
            .background(Color(.systemBackground))
            .cornerRadius(20)
            .shadow(radius: 10)
            .padding()
            .onChange(of: isAssistantTyping) { typing in
                if typing {
                    startTypingDotsAnimation()
                }
            }

            if showToast {
                VStack {
                    Spacer()
                    Text("✅ Feedback Saved!")
                        .padding()
                        .background(Color.green.opacity(0.9))
                        .foregroundColor(.white)
                        .cornerRadius(12)
                        .padding(.bottom, 20)
                        .transition(.move(edge: .bottom))
                        .animation(.easeInOut, value: showToast)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    func startTypingDotsAnimation() {
        typingDots = ""
        Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { timer in
            if !isAssistantTyping {
                timer.invalidate()
                return
            }
            if typingDots.count >= 3 {
                typingDots = ""
            } else {
                typingDots += "."
            }
        }
    }

    func sendMessage() {
        guard !userInput.trimmingCharacters(in: .whitespaces).isEmpty else { return }

        let userMessage = ChatMessage(sender: "user", text: userInput)
        messages.append(userMessage)

        let sendingText = userInput
        userInput = ""
        isAssistantTyping = true

        submitFeedback(text: sendingText)
    }

    func submitFeedback(text: String) {
        guard let url = URL(string: "http://127.0.0.1:8000/submit-feedback") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        var body: [String: Any] = ["message": text]
        if let sessionID = sessionID {
            body["session_id"] = sessionID
        }
        if let selectedCategory = selectedCategory {
            body["category"] = selectedCategory
        }

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data else { return }
            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let botReply = json["bot_reply"] as? String,
                   let newSession = json["session_id"] as? String {
                    DispatchQueue.main.async {
                        self.sessionID = newSession
                        let botMessage = ChatMessage(sender: "assistant", text: botReply)
                        messages.append(botMessage)
                        isAssistantTyping = false
                        fetchLatestSummary(sessionID: newSession)
                    }
                }
            } catch {
                print("Error decoding feedback response: \(error)")
            }
        }.resume()
    }

    func fetchLatestSummary(sessionID: String) {
        guard let url = URL(string: "http://127.0.0.1:8000/summarize/\(sessionID)") else { return }
        URLSession.shared.dataTask(with: url) { _, _, _ in }.resume()
    }

    func finalizeSummary(sessionID: String) {
        guard let url = URL(string: "http://127.0.0.1:8000/finalize-summary/\(sessionID)") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("Finalization error: \(error)")
                return
            }
            DispatchQueue.main.async {
                showToast = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                    showToast = false
                }
            }
        }.resume()
    }
}

struct FeedbackChatView_Previews: PreviewProvider {
    static var previews: some View {
        FeedbackChatView(showChatbot: .constant(true))
    }
}
