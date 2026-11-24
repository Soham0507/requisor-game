import React from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import GamesCatalog from "@/pages/games-catalog";
import Customize from "@/pages/customize";
import Admin from "@/pages/admin";
import { GameFinderChat } from "@/components/GameFinderChat";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/games">
        <GamesCatalog />
      </Route>
      <Route path="/games/activations">
        <GamesCatalog vertical="activations" />
      </Route>
      <Route path="/games/quiz-questionnaire-survey">
        <GamesCatalog vertical="quiz-questionnaire-survey" />
      </Route>
      <Route path="/customize/:slug" component={Customize} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Chat() {
  const [location] = useLocation();
  return location.startsWith("/admin") ? null : <GameFinderChat />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
          <Chat />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
