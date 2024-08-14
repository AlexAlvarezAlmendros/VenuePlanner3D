import React from 'react';

const Inventory = ({ onSelect }) => {
  return (
    <div className="inventory">
      <h2>Inventory</h2>
      <div>
        <button onClick={() => onSelect('truss')}>Truss</button>
        <button onClick={() => onSelect('light')}>Light</button>
        <button onClick={() => onSelect('speaker')}>Speaker</button>
      </div>
    </div>
  );
};

export default Inventory;
