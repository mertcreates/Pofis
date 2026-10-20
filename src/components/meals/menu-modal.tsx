"use client";

import { useState } from "react";
import Modal from "@/components/modal.js";
import { useMealMenu } from "@/data/use-meal-menu";
import { getMealDateRange } from "@/lib/meals/dates";
import { getMealPofiCommentary } from "@/lib/meals/commentary";
import { presentMeal, type MealSide } from "@/lib/meals/presentation";
import { ui } from "@/lib/ui-text.js";
import { MealDatePicker } from "./date-picker";
import "./menu.css";

function hasSingleDishName(name: string) {
  return !/\(\s*SEÇ\.?\s*\)|\s+-\s*|\s*-\s+/iu.test(name);
}

function MealSideCard({ side, label = side.label, showItems = false }: { side: MealSide; label?: string; showItems?: boolean }) {
  const items = showItems ? side.items : [side.name];
  return (
    <section className={`meal-side-card${showItems ? " meal-side-card--finish" : ""}${side.kind === "dessert" ? " meal-side-card--dessert" : ""}`} aria-label={label}>
      <div className="meal-side-card-heading">
        <span className="meal-side-label">{label}</span>
        {!showItems && side.calorie !== null && <span className="meal-calorie">{side.calorie} kcal</span>}
      </div>
      <ul className={showItems ? "meal-side-card-items" : "meal-side-card-featured"}>
        {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
      </ul>
    </section>
  );
}

export function MealMenuModal({ today, onClose }: { today: string; onClose: () => void }) {
  const { minDate, maxDate } = getMealDateRange(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const { state, retry } = useMealMenu(selectedDate);
  const meal = state.kind === "loaded" && state.menu ? presentMeal(state.menu) : null;
  const pofiCommentary = meal ? getMealPofiCommentary(meal) : null;
  const soup = meal?.kind === "structured" ? meal.sides.find((side) => side.kind === "soup") : undefined;
  const accompaniment = meal?.kind === "structured" ? meal.sides.find((side) => side.kind === "accompaniment") : undefined;
  const finishKinds = ["extras", "salad", "dessert"] as const;
  const finishSides = meal?.kind === "structured"
    ? finishKinds.flatMap((kind) => meal.sides.filter((side) => side.kind === kind))
    : [];
  return (
    <Modal title={ui.meals.title} description={
      <MealDatePicker value={selectedDate} today={today} minDate={minDate} maxDate={maxDate} onChange={setSelectedDate} />
    } className="meal-menu-modal" initialFocus="title" onClose={onClose}>
      <div className="meal-menu-content">
        <div className="meal-layout">
          <div className="meal-menu-column">
            {state.kind === "loading" ? (
              <p className="meal-empty" role="status">{ui.meals.loading}</p>
            ) : state.kind === "error" ? (
              <div className="meal-request-error" role="alert">
                <p>{ui.meals.unavailable}</p>
                <button type="button" className="text-button" onClick={retry}>{ui.meals.retry}</button>
              </div>
            ) : meal?.kind === "structured" ? (
              <section className="meal-tray" aria-label="Yemek menüsü">
                <section className="meal-main-group" aria-label="Ana yemek seçenekleri">
                  <div className="meal-main-header">
                    <div className="meal-main-heading-copy">
                      <span className="meal-main-label">Ana yemek</span>
                    </div>
                    {meal.mainCalorie !== null && <span className="meal-calorie">{meal.mainCalorie} kcal</span>}
                  </div>
                  <ul className="meal-main-options">
                    {meal.mains.map((name, index) => <li className="meal-main-option-row" key={`${name}-${index}`}>
                      <span className="meal-main-choice-line"><span className="meal-main-choice">{name}</span></span>
                    </li>)}
                    {meal.vegetarian && <li className="meal-main-option-row" key="vegetarian-choice">
                      <span className="meal-main-choice-line">
                        <span className="meal-main-choice">{meal.vegetarian.name}</span>
                        <span className="meal-main-choice-meta">Vejetaryen</span>
                      </span>
                    </li>}
                  </ul>
                </section>
                <div className={`meal-top-cards${soup && accompaniment ? "" : " meal-top-cards--single"}`}>
                  {soup && <MealSideCard side={soup} />}
                  {accompaniment && <MealSideCard side={accompaniment} label="Yanında" />}
                </div>
                <div className="meal-finishes">
                  {finishSides.map((side) => <MealSideCard side={side} showItems key={side.kind} />)}
                </div>
              </section>
            ) : meal?.kind === "source" && meal.dishes.length > 0 ? (
              <section className="meal-source-menu" aria-label="Yemek listesi">
                {meal.dishes.map((dish, index) => <div className="meal-source-row" key={index}>
                  <span>{dish.name}</span>{dish.calorie !== null && hasSingleDishName(dish.name) && <span className="meal-calorie">{dish.calorie} kcal</span>}
                </div>)}
              </section>
            ) : (
              <p className="meal-empty" role="status">{ui.meals.empty}</p>
            )}
          </div>
          {pofiCommentary && <aside className="meal-pofi-note" aria-label="Pofi’nin menüye notu">
            <img className="meal-pofi" src="/pofi/pofi-meal.webp" width={40} height={40} alt="Pofi, yemek masasında" />
            <p>{pofiCommentary}</p>
          </aside>}
        </div>
      </div>
    </Modal>
  );
}
