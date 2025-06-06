from flask import Flask, request, jsonify
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'cfr'))
from cfr_solver import CFRTrainer, GameState
import json

app = Flask(__name__)

# Load strategy once at startup
with open(os.path.join(os.path.dirname(__file__), 'cfr', 'plhe_cfr_strategy.json'), 'r', encoding='utf-8') as f:
    strategy = json.load(f)

trainer = CFRTrainer()
trainer.nodes = {k: CFRTrainer().nodes.get(k) or CFRTrainer().nodes.setdefault(k, None) for k in strategy.keys()}

@app.route('/ai-move', methods=['POST'])
def ai_move():
    data = request.json
    # Expecting: deck, board, hole_cards, player, dealer, stage, pot, to_call, checked, history, terminal, winner
    state = GameState(
        deck=data['deck'],
        board=data['board'],
        hole_cards=data['hole_cards'],
        player=data['player'],
        dealer=data['dealer'],
        stage=data['stage'],
        pot=data['pot'],
        to_call=data['to_call'],
        checked=data['checked'],
        history=data['history'],
        terminal=data.get('terminal', False),
        winner=data.get('winner', None)
    )
    move = trainer.get_move(state, data['player'])
    return jsonify({'move': move})

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
    return response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
