import React, { useState, useEffect } from 'react';

const TodoApp = () => {
  const [tasks, setTasks] = useState([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const storedTasks = JSON.parse(localStorage.getItem('tasks')) || [];
    setTasks(storedTasks);
  }, []);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const addTask = () => {
    if (inputValue.trim()) {
      setTasks([...tasks, inputValue]);
      setInputValue('');
    }
  };

  const removeTask = (taskToRemove) => {
    setTasks(tasks.filter(task => task !== taskToRemove));
  };

  return (
    <div>
      <h1>Todo List</h1>
      <input type="text" value={inputValue} onChange={handleInputChange} placeholder="Add a new task" />
      <button onClick={addTask}>Add Task</button>
      <ul>
        {tasks.map((task, index) => (
          <li key={index}>
            {task} <button onClick={() => removeTask(task)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TodoApp;