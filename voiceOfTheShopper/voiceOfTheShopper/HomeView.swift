//
//  HomeView.swift
//  voiceOfTheShopper
//
//  Created by Tyler Pierson on 4/28/25.
//

import SwiftUI

struct HomeView: View {
    @State private var showAdmin = false
    @State private var showChatbot = false
    
    var body: some View {
        NavigationView {
            ZStack {
                VStack(spacing: 20) {
                    Text("Voice of the Shopper")
                        .font(.largeTitle)
                        .padding(.top, 50)
                    
//                    NavigationLink(destination: AdminDashboardView(), isActive: $showAdmin) {
//                        Button(action: {
//                            showAdmin = true
//                        }) {
//                            Text("Go to Admin Dashboard")
//                                .font(.headline)
//                                .padding()
//                                .frame(maxWidth: .infinity)
//                                .background(Color.blue)
//                                .foregroundColor(.white)
//                                .cornerRadius(10)
//                                .padding(.horizontal, 30)
//                        }
//                    }
                    
                    Spacer()
                }
                
                // Floating Chat Button
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Button(action: {
                            withAnimation {
                                showChatbot.toggle()
                            }
                        }) {
                            Image(systemName: "message.fill")
                                .foregroundColor(.white)
                                .padding()
                                .background(Color.green)
                                .clipShape(Circle())
                                .shadow(radius: 5)
                        }
                        .padding()
                    }
                }
                
                // Chatbot Popup
                // Chatbot Popup
                if showChatbot {
                    VStack {
                        Spacer()
                        HStack {
                            Spacer()
                            FeedbackChatView(showChatbot: $showChatbot)
                                .frame(width: 350, height: 600)
                                .background(Color(.systemBackground))
                                .cornerRadius(20)
                                .shadow(radius: 10)
                                .padding(.bottom, 40) // give it more breathing room
                                .padding(.trailing, 20)
                        }
                    }
                    .transition(.move(edge: .bottom))
                }
            }
        }
    }
}
