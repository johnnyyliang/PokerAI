from cfr_solver import CFRTrainer

if __name__ == "__main__":
    trainer = CFRTrainer()
    # Start with a small number of iterations for quick testing
    iterations = 50000
    strategy = trainer.train(iterations)
    trainer.save_strategy(strategy, "backend/python/cfr/plhe_cfr_strategy.json")
    print(f"Training complete. Strategy saved to plhe_cfr_strategy.json after {iterations} iterations.") 