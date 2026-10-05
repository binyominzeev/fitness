import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { RequireAuth } from "./components/RequireAuth";
import { UserDataProvider } from "./context/UserDataContext";
import { WorkoutProvider } from "./context/WorkoutContext";
import { useExercises } from "./hooks/useExercises";
import { AICoachPage } from "./pages/AICoachPage";
import { ExercisesPage } from "./pages/ExercisesPage";
import { PlaybackPage } from "./pages/PlaybackPage";
import { PlanPage } from "./pages/PlanPage";
import { WorkoutWizardPage } from "./pages/WorkoutWizardPage";

function App() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const catalog = useExercises(query, category);

  return (
    <UserDataProvider>
    <WorkoutProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route
            path="/"
            element={
              <ExercisesPage
                query={query}
                onQueryChange={setQuery}
                category={category}
                onCategoryChange={setCategory}
                filteredExercises={catalog.filteredExercises}
                categories={catalog.categories}
                isLoading={catalog.isLoading}
                error={catalog.error}
              />
            }
          />
          <Route
            path="/terv"
            element={
              <RequireAuth reason="Az edzésterved a fiókodhoz van kötve.">
                <PlanPage exercisesById={catalog.exercisesById} />
              </RequireAuth>
            }
          />
          <Route
            path="/terv/uj"
            element={
              <RequireAuth reason="Az edzésterved a fiókodhoz van kötve.">
                <WorkoutWizardPage exercises={catalog.exercises} />
              </RequireAuth>
            }
          />
          <Route
            path="/ai-edzo"
            element={
              <RequireAuth reason="Az AI-edző használatához bejelentkezés kell.">
                <AICoachPage exercises={catalog.exercises} exercisesById={catalog.exercisesById} />
              </RequireAuth>
            }
          />
          <Route
            path="/lejatszas"
            element={
              <RequireAuth reason="A lejátszáshoz az edzéstervedre van szükség.">
                <PlaybackPage exercisesById={catalog.exercisesById} />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </WorkoutProvider>
    </UserDataProvider>
  );
}

export default App;
