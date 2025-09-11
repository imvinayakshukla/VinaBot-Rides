import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './header/header';
import { Chatbot } from "./chatbot/chatbot";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Chatbot],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('vinabot-rides-app');
}
